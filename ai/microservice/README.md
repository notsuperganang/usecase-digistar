# TelcoCare AI - ML Microservice

FastAPI-based microservice for customer support ticket classification using Machine Learning.

## Features

- **High Accuracy ML Model** - 96-99% F1-scores across all clusters
- **Fast Inference** - < 50ms average prediction time
- **Batch Processing** - Efficiently handle multiple tickets
- **Auto-Escalation** - Automatically flag high-priority issues
- **Production Ready** - Full validation, error handling, and monitoring

## Architecture

```
ai/microservice/
├── config/                  # Configuration system
│   ├── preprocessing.py     # Text cleaning functions
│   ├── settings.py          # App settings
│   ├── cluster_mapping.json # Cluster configurations
│   └── ...
├── model/                   # Trained ML model
│   └── model-telco-cs.pkl
├── src/                     # API implementation
│   ├── main.py             # FastAPI application
│   ├── routes.py           # API endpoints
│   ├── schemas.py          # Request/Response models
│   └── model_loader.py     # ML model wrapper
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Quick Start

### 1. Install Dependencies

```bash
# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Or use conda
conda activate all

# Install dependencies
pip install -r requirements.txt
```

### 2. Validate Configuration

```bash
# Test configuration system
python -m config.example
```

Expected output:
```
✅ ALL CONFIGURATIONS VALID!
✅ Configuration system is properly set up!
✅ Ready to implement the inference API
```

### 3. Run the Service

```bash
# From microservice directory
cd ai/microservice

# Run with uvicorn
python src/main.py

# Or directly with uvicorn
uvicorn src.main:app --reload --port 8000
```

### 4. Access API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/v1/health

## API Endpoints

### POST `/api/v1/predict`

Classify a single support ticket.

**Request:**
```json
{
  "text": "Internet mati total dari pagi! Rugi saya!",
  "ticket_id": "TKT-12345"
}
```

**Response:**
```json
{
  "ticket_id": "TKT-12345",
  "input_text": "Internet mati total dari pagi! Rugi saya!",
  "cleaned_text": "internet mati total dari pagi rugi saya",
  "prediction": {
    "cluster": 3,
    "urgency": "High",
    "priority": "P1",
    "confidence": 0.9983,
    "auto_escalate": true,
    "probabilities": [0.0003, 0.0005, 0.0009, 0.9983]
  },
  "timestamp": "2025-12-31T10:30:00",
  "model_version": "v1.0",
  "processing_time_ms": 15.3
}
```

### POST `/api/v1/predict/batch`

Classify multiple tickets efficiently.

**Request:**
```json
{
  "texts": [
    "Terima kasih atas bantuannya!",
    "Sinyal mati total, tolong cepat!"
  ],
  "ticket_ids": ["TKT-001", "TKT-002"]
}
```

**Response:**
```json
{
  "predictions": [
    { /* prediction 1 */ },
    { /* prediction 2 */ }
  ],
  "total_processed": 2,
  "timestamp": "2025-12-31T10:30:00",
  "total_processing_time_ms": 25.7
}
```

### GET `/api/v1/health`

Check service health status.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_version": "v1.0",
  "config_valid": true,
  "timestamp": "2025-12-31T10:30:00"
}
```

## Cluster Classification

The model classifies tickets into 4 clusters:

| Cluster | Urgency | Priority | Description | Auto-Escalate |
|---------|---------|----------|-------------|---------------|
| 0 | Low | P3 | Thanks, feedback, info requests | No |
| 1 | Low | P3 | Greetings, general help | No |
| 2 | Medium | P2 | Follow-ups, status checks | No |
| 3 | High | P1 | Critical issues, service outages | Yes |

## Environment Variables

Configure the service using environment variables:

```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=true

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Inference
CONFIDENCE_THRESHOLD=0.7
MAX_TEXT_LENGTH=10000
MAX_BATCH_SIZE=100

# Logging
LOG_LEVEL=INFO
```

## Example Usage

### Python

```python
import requests

# Single prediction
response = requests.post(
    "http://localhost:8000/api/v1/predict",
    json={
        "text": "Internet mati total!",
        "ticket_id": "TKT-123"
    }
)
print(response.json())

# Batch prediction
response = requests.post(
    "http://localhost:8000/api/v1/predict/batch",
    json={
        "texts": [
            "Terima kasih!",
            "Sinyal error!"
        ]
    }
)
print(response.json())
```

### cURL

```bash
# Single prediction
curl -X POST "http://localhost:8000/api/v1/predict" \
  -H "Content-Type: application/json" \
  -d '{"text":"Internet mati total!","ticket_id":"TKT-123"}'

# Health check
curl "http://localhost:8000/api/v1/health"
```

### JavaScript/TypeScript

```typescript
// Single prediction
const response = await fetch('http://localhost:8000/api/v1/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Internet mati total!',
    ticket_id: 'TKT-123'
  })
});

const result = await response.json();
console.log(result);
```

## Model Performance

Evaluated on 19,818 test samples:

| Cluster | Precision | Recall | F1-Score |
|---------|-----------|--------|----------|
| Cluster 0 | 97.10% | 98.57% | 97.83% |
| Cluster 1 | 96.55% | 96.39% | 96.47% |
| Cluster 2 | 97.67% | 95.99% | 96.82% |
| Cluster 3 | 99.31% | 99.45% | 99.38% |

**Overall Accuracy**: 97.5%

## Development

### Running Tests

```bash
# Test configuration system
python -m config.example

# Expected: All tests pass ✅
```

### Code Structure

- **src/main.py** - FastAPI application with lifespan management
- **src/routes.py** - API endpoint implementations
- **src/schemas.py** - Pydantic models for validation
- **src/model_loader.py** - ML model loading and prediction
- **config/** - Configuration management system

### Adding New Features

1. **New preprocessing step**: Edit `config/preprocessing.py`
2. **New cluster**: Update `config/cluster_mapping.json`
3. **New endpoint**: Add to `src/routes.py`
4. **New response field**: Update `src/schemas.py`

## Deployment

### Docker (Coming Soon)

```bash
docker build -t telcocare-ml:latest .
docker run -p 8000:8000 telcocare-ml:latest
```

### Production Checklist

- [ ] Set `API_RELOAD=false` in production
- [ ] Configure proper `CORS_ORIGINS`
- [ ] Set appropriate `LOG_LEVEL` (WARNING or ERROR)
- [ ] Enable HTTPS/TLS
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Use process manager (e.g., gunicorn, supervisor)

## Troubleshooting

### Model Not Loading

```
Error: Model file not found
```

**Solution**: Ensure `model/model-telco-cs.pkl` exists

### Configuration Errors

```
Error: Configuration validation failed
```

**Solution**: Run `python -m config.example` to identify issues

### Import Errors

```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution**: Install dependencies with `pip install -r requirements.txt`

## Support

For issues or questions about the ML microservice, please refer to:
- API Documentation: http://localhost:8000/docs
- Configuration README: [config/README.md](config/README.md)
- Project Documentation: [../../docs/](../../docs/)

## License

Part of the TelcoCare AI project.
