/**
 * TelcoCare AI Chatbot - Focused Web Chat UI Logic
 * Framework-free SPA: chat-only interaction with Indonesian empathetic auto-replies,
 * intent badges, quick actions, summary, suggestions, and basic routing to Help.
 */
(function () {
  'use strict';

  // --------- DOM helpers ---------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const now = () => new Date();
  const fmtTime = (d) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const titleCase = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  // --------- Elements ---------
  const els = {
    // Views
    viewChat: $('#view-chat'),           // [section#view-chat](webchat/index.html:29)
    viewHelp: $('#view-help'),           // [section#view-help](webchat/index.html:90)
    navBtns: $all('.nav-btn'),           // [button.nav-btn](webchat/index.html:21)

    // Chat shell
    messages: $('#messages'),            // [section#messages](webchat/index.html:42)
    typing: $('#chat-loading'),          // [div#chat-loading](webchat/index.html:51)
    summary: $('#chat-summary'),         // [p#chat-summary](webchat/index.html:84)
    intentBadge: $('#last-intent-badge'),// [span#last-intent-badge](webchat/index.html:37)

    // Composer
    form: $('#chat-form'),               // [form#chat-form](webchat/index.html:64)
    input: $('#chat-input'),             // [input#chat-input](webchat/index.html:66)
    send: $('#chat-send'),               // [button#chat-send](webchat/index.html:74)
    voice: $('#chat-voice'),             // [button#chat-voice](webchat/index.html:73)

    // Suggestions
    suggests: $all('.chip.suggest')      // [button.chip.suggest](webchat/index.html:57)
  };

  // Ensure typing indicator hidden initially even if CSS .hidden is not present
  if (els.typing) els.typing.style.display = 'none';

  // --------- State ---------
  const state = {
    messages: [] // { role: 'user' | 'ai', text: string, time: Date, intent?: string }
  };

  // --------- Intent Detection ---------
  const INTENTS = [
    { key: 'billing', label: 'Billing', keywords: ['tagih', 'bill', 'harga', 'biaya', 'double charge', 'refund'] },
    { key: 'jaringan', label: 'Jaringan', keywords: ['sinyal', 'jaringan', 'internet lambat', 'putus', 'apn', 'network'] },
    { key: 'roaming', label: 'Roaming', keywords: ['roaming', 'internasional', 'international', 'luar negeri', 'singapura', 'malaysia'] },
    { key: 'paket', label: 'Paket', keywords: ['paket', 'kuota', 'upgrade', 'aktivasi', 'langganan', 'subscribe'] },
    { key: 'promo', label: 'Promo', keywords: ['promo', 'voucher', 'diskon', 'kode'] },
  ];
  function detectIntent(text) {
    const t = (text || '').toLowerCase();
    for (const intent of INTENTS) {
      if (intent.keywords.some(k => t.includes(k))) return intent;
    }
    return { key: 'lainnya', label: 'Lainnya', keywords: [] };
  }

  function setIntentBadge(intentLabel) {
    els.intentBadge.textContent = `Intent: ${intentLabel || '-'}`;
    els.intentBadge.className = 'badge intent';
  }

  // --------- AI Response ---------
  function aiResponse(text) {
    const intent = detectIntent(text);
    const greeting = 'Terima kasih telah menghubungi TelcoCare. Kami mohon maaf atas ketidaknyamanan yang Anda alami.';
    let body;
    switch (intent.key) {
      case 'billing':
        body = `${greeting}
Berdasarkan informasi awal, kami akan memverifikasi rincian penagihan Anda terlebih dahulu. 
Mohon bantuannya untuk menyebutkan periode tagihan dan nominal yang tidak sesuai. 
Kami akan memberikan pembaruan setelah pengecekan selesai.`;
        break;
      case 'jaringan':
        body = `${greeting}
Kami mencatat adanya kendala jaringan/kecepatan di lokasi Anda. 
Silakan coba nonaktif/aktifkan mode pesawat, pastikan APN standar, lalu uji kembali. 
Jika masih terkendala, mohon kirimkan lokasi (kelurahan/kecamatan) dan waktu kejadian untuk kami prioritaskan.`;
        break;
      case 'roaming':
        body = `${greeting}
Mohon pastikan paket roaming aktif serta fitur roaming data di perangkat sudah diaktifkan. 
Coba pilih jaringan mitra yang direkomendasikan. Kami juga akan memeriksa status paket Anda.`;
        break;
      case 'paket':
        body = `${greeting}
Terkait pembelian/aktivasi paket, mungkin ada keterlambatan sinkronisasi. 
Silakan cek kembali dalam 10–15 menit. Jika kuota belum bertambah, balas pesan ini agar kami bantu eskalasi.`;
        break;
      case 'promo':
        body = `${greeting}
Kami akan memverifikasi masa berlaku serta ketentuan kode promo. 
Pastikan aplikasi Telco versi terbaru telah terpasang. Jika masih tidak berhasil, mohon kirimkan kode promo dan waktu percobaan.`;
        break;
      default:
        body = `${greeting}
Pesan Anda telah kami terima dan akan kami arahkan ke tim yang relevan. 
Mohon menunggu pembaruan dari kami. Terima kasih atas pengertian Anda.`;
        break;
    }
    const summary = makeSummary(intent.label, text);
    return { intent, text: body, summary };
  }

  function makeSummary(intentLabel, userText) {
    const base = `Kategori: ${intentLabel}.`;
    const brief = (userText || '').trim().slice(0, 110);
    return `${base} Ringkasan: "${brief || 'Pertanyaan umum pelanggan'}".`;
  }

  // --------- Rendering ---------
  function renderMessage(msg) {
    // msg: { role: 'user' | 'ai', text: string, time: Date, intent?: string, actions?: true }
    const art = document.createElement('article');
    art.className = 'message' + (msg.role === 'user' ? ' sent' : '');

    const avatar = document.createElement('div');
    avatar.className = 'avatar';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    // Allow rich content for AI when actions are present
    const isRich = msg.role === 'ai' && msg.actions;
    if (isRich) {
      bubble.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = msg.text;
      bubble.appendChild(p);

      // Quick actions
      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      actions.style.marginTop = '8px';

      const btnHelp = document.createElement('button');
      btnHelp.className = 'btn ghost';
      btnHelp.textContent = 'Butuh Bantuan Lainnya';
      btnHelp.addEventListener('click', () => {
        els.input.value = '';
        els.input.focus();
      });

      const btnAgent = document.createElement('button');
      btnAgent.className = 'btn primary';
      btnAgent.textContent = 'Hubungi Agent';
      btnAgent.addEventListener('click', () => {
        appendAI('Baik, kami akan menghubungkan Anda ke agent kami. Mohon tunggu...', { intentOverride: msg.intent });
      });

      actions.appendChild(btnHelp);
      actions.appendChild(btnAgent);
      bubble.appendChild(actions);
    } else {
      bubble.textContent = msg.text;
    }

    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = fmtTime(msg.time);
    bubble.appendChild(meta);

    if (msg.role === 'user') {
      art.appendChild(bubble);
      art.appendChild(avatar);
    } else {
      art.appendChild(avatar);
      art.appendChild(bubble);
    }

    els.messages.appendChild(art);
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function showTyping(show) {
    if (!els.typing) return;
    els.typing.style.display = show ? 'inline-flex' : 'none';
  }

  function appendUser(text) {
    const msg = { role: 'user', text, time: now() };
    state.messages.push(msg);
    renderMessage(msg);
  }

  function appendAI(text, opts = {}) {
    const msg = { role: 'ai', text, time: now(), intent: opts.intentOverride };
    // When we want actions after a main reply
    if (opts.actions) msg.actions = true;
    state.messages.push(msg);
    renderMessage(msg);
  }

  function replyFlow(userText) {
    showTyping(true);
    setTimeout(() => {
      const { intent, text, summary } = aiResponse(userText);

      // Update badge
      setIntentBadge(intent.label);

      // Append AI reply with quick actions
      appendAI(text, { intentOverride: intent.label, actions: true });

      // Update summary
      els.summary.textContent = summary;
      els.summary.setAttribute('data-empty', 'false');

      showTyping(false);
    }, 800);
  }

  // --------- Events ---------
  function bindNav() {
    els.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        route(view);
      });
    });
  }

  function bindSuggestions() {
    els.suggests.forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-text') || chip.textContent;
        els.input.value = text;
        els.input.focus();
        // Optionally auto-send:
        submitCurrent();
      });
    });
  }

  function bindComposer() {
    els.form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitCurrent();
    });
    els.voice.addEventListener('click', () => {
      // Placeholder: integrate Web Speech API or recorder as needed
      appendAI('Fitur rekam suara belum diaktifkan pada versi ini.', {});
    });
  }

  function submitCurrent() {
    const text = (els.input.value || '').trim();
    if (!text) return;
    appendUser(text);
    els.input.value = '';
    replyFlow(text);
  }

  // --------- Routing ---------
  function route(view) {
    // Toggle top nav active
    els.navBtns.forEach(b => {
      const isActive = b.getAttribute('data-view') === view;
      b.classList.toggle('active', isActive);
    });
    // Views
    els.viewChat.classList.toggle('active', view === 'chat');
    els.viewHelp.classList.toggle('active', view === 'help');
  }

  // --------- Boot ---------
  function init() {
    bindNav();
    bindSuggestions();
    bindComposer();
    route('chat'); // default
    // Welcome message
    appendAI('Halo! Saya TelcoCare AI. Silakan jelaskan kendala atau pertanyaan Anda, misalnya "Tagihan tidak sesuai" atau "Masalah jaringan".', {});
  }

  // Start
  init();

})();