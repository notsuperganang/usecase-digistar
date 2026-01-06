/**
 * Analytics API Endpoint
 *
 * Provides analytics data for the customer care dashboard
 * - Weekly summary by category
 * - Trending issues over time
 * - Performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { logger } from '@/lib/logger';

/**
 * GET /api/analytics?period=7&metric=summary
 *
 * Query Parameters:
 * - period: Number of days to analyze (default: 7)
 * - metric: Type of analytics (summary|trends|performance|keywords)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const period = parseInt(searchParams.get('period') || '7', 10);
    const metric = searchParams.get('metric') || 'summary';

    logger.info('Analytics request received', { metric, period });

    // Validate period
    if (period < 1 || period > 365) {
      return NextResponse.json(
        { error: 'Invalid period. Must be between 1 and 365 days.' },
        { status: 400 }
      );
    }

    let result;

    switch (metric) {
      case 'summary':
        result = await getWeeklySummary(period);
        break;
      case 'trends':
        result = await getTrends(period);
        break;
      case 'performance':
        result = await getPerformanceMetrics(period);
        break;
      case 'keywords':
        result = await getTopKeywords(period);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid metric. Must be: summary, trends, performance, or keywords.' },
          { status: 400 }
        );
    }

    const elapsed = Date.now() - startTime;
    logger.info('Analytics request completed', { metric, period, elapsed_ms: elapsed });

    return NextResponse.json({
      ...result,
      period_days: period,
      timestamp: new Date().toISOString(),
      processing_time_ms: elapsed,
    });

  } catch (error) {
    logger.error('Analytics request failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch analytics data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Weekly Summary: Volume by category
 */
async function getWeeklySummary(days: number) {
  const { data, error } = await supabase
    .from('ticket_results')
    .select('llm_issue_category, ml_urgency, ml_cluster, ml_auto_escalate, llm_ml_valid, ml_confidence, total_processing_time_ms')
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  // Group by category
  const categoryStats = data.reduce((acc: any, ticket: any) => {
    const category = ticket.llm_issue_category || 'Uncategorized';

    if (!acc[category]) {
      acc[category] = {
        category,
        count: 0,
        auto_escalated: 0,
        ml_valid: 0,
        ml_invalid: 0,
        avg_confidence: 0,
        avg_processing_time: 0,
        urgency_breakdown: { Low: 0, Medium: 0, High: 0 },
      };
    }

    acc[category].count++;
    if (ticket.ml_auto_escalate) acc[category].auto_escalated++;
    if (ticket.llm_ml_valid) acc[category].ml_valid++;
    if (ticket.llm_ml_valid === false) acc[category].ml_invalid++;
    acc[category].avg_confidence += ticket.ml_confidence || 0;
    acc[category].avg_processing_time += ticket.total_processing_time_ms || 0;

    const urgency = ticket.ml_urgency || 'Low';
    acc[category].urgency_breakdown[urgency]++;

    return acc;
  }, {});

  // Calculate averages and sort by count
  const categories = Object.values(categoryStats).map((cat: any) => ({
    ...cat,
    avg_confidence: cat.count > 0 ? (cat.avg_confidence / cat.count).toFixed(4) : 0,
    avg_processing_time: cat.count > 0 ? Math.round(cat.avg_processing_time / cat.count) : 0,
  })).sort((a: any, b: any) => b.count - a.count);

  // Overall stats
  const totalTickets = data.length;
  const totalAutoEscalated = data.filter((t: any) => t.ml_auto_escalate).length;
  const avgConfidence = totalTickets > 0
    ? (data.reduce((sum: number, t: any) => sum + (t.ml_confidence || 0), 0) / totalTickets).toFixed(4)
    : "0.0000";
  const avgProcessingTime = totalTickets > 0
    ? Math.round(data.reduce((sum: number, t: any) => sum + (t.total_processing_time_ms || 0), 0) / totalTickets)
    : 0;

  return {
    metric: 'summary',
    total_tickets: totalTickets,
    total_auto_escalated: totalAutoEscalated,
    avg_confidence: parseFloat(avgConfidence),
    avg_processing_time_ms: avgProcessingTime,
    categories,
  };
}

/**
 * Trends: Daily volume over time
 */
async function getTrends(days: number) {
  const { data, error } = await supabase
    .from('ticket_results')
    .select('created_at, llm_issue_category, ml_urgency')
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  // Group by date and category
  const dailyTrends: any = {};

  data.forEach((ticket: any) => {
    const date = new Date(ticket.created_at).toISOString().split('T')[0];
    const category = ticket.llm_issue_category || 'Uncategorized';

    if (!dailyTrends[date]) {
      dailyTrends[date] = { date, total: 0, by_category: {} };
    }

    dailyTrends[date].total++;
    dailyTrends[date].by_category[category] = (dailyTrends[date].by_category[category] || 0) + 1;
  });

  const trends = Object.values(dailyTrends).sort((a: any, b: any) =>
    a.date.localeCompare(b.date)
  );

  return {
    metric: 'trends',
    total_days: Object.keys(dailyTrends).length,
    trends,
  };
}

/**
 * Performance Metrics: Processing times and ML accuracy
 */
async function getPerformanceMetrics(days: number) {
  const { data, error } = await supabase
    .from('ticket_results')
    .select('translation_time_ms, ml_processing_time_ms, llm_processing_time_ms, total_processing_time_ms, ml_confidence, llm_ml_valid')
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  const totalTickets = data.length;

  if (totalTickets === 0) {
    return {
      metric: 'performance',
      message: 'No data available for the selected period',
    };
  }

  // Calculate averages
  const avgTranslation = Math.round(
    data.reduce((sum: number, t: any) => sum + (t.translation_time_ms || 0), 0) / totalTickets
  );
  const avgML = Math.round(
    data.reduce((sum: number, t: any) => sum + (t.ml_processing_time_ms || 0), 0) / totalTickets
  );
  const avgLLM = Math.round(
    data.reduce((sum: number, t: any) => sum + (t.llm_processing_time_ms || 0), 0) / totalTickets
  );
  const avgTotal = Math.round(
    data.reduce((sum: number, t: any) => sum + (t.total_processing_time_ms || 0), 0) / totalTickets
  );
  const avgConfidence = parseFloat(
    (data.reduce((sum: number, t: any) => sum + (t.ml_confidence || 0), 0) / totalTickets).toFixed(4)
  );

  // ML validation rate
  const mlValidCount = data.filter((t: any) => t.llm_ml_valid === true).length;
  const mlInvalidCount = data.filter((t: any) => t.llm_ml_valid === false).length;
  const mlValidationRate = totalTickets > 0
    ? parseFloat(((mlValidCount / totalTickets) * 100).toFixed(2))
    : 0;

  return {
    metric: 'performance',
    total_tickets: totalTickets,
    processing_times: {
      avg_translation_ms: avgTranslation,
      avg_ml_ms: avgML,
      avg_llm_ms: avgLLM,
      avg_total_ms: avgTotal,
    },
    ml_performance: {
      avg_confidence: avgConfidence,
      ml_valid_count: mlValidCount,
      ml_invalid_count: mlInvalidCount,
      ml_validation_rate: mlValidationRate,
    },
  };
}

/**
 * Top Keywords: Most frequent themes
 */
async function getTopKeywords(days: number, limit: number = 20) {
  const { data, error } = await supabase
    .from('ticket_keywords')
    .select('keyword, frequency, created_at')
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  // Aggregate keywords
  const keywordMap: any = {};

  data.forEach((row: any) => {
    const keyword = row.keyword;
    if (!keywordMap[keyword]) {
      keywordMap[keyword] = { keyword, total_mentions: 0, ticket_count: 0 };
    }
    keywordMap[keyword].total_mentions += row.frequency || 1;
    keywordMap[keyword].ticket_count++;
  });

  const keywords = Object.values(keywordMap)
    .sort((a: any, b: any) => b.total_mentions - a.total_mentions)
    .slice(0, limit);

  return {
    metric: 'keywords',
    total_unique_keywords: Object.keys(keywordMap).length,
    top_keywords: keywords,
  };
}
