/* ============================================================
   GEN-QR — App Logic
   Linked from: index.html
   Depends on:  qrcode.min.js (loaded before this file)
   ============================================================ */

/* ── State ── */
var qrInstance = null;

var ECC_MAP = {
  L: QRCode.CorrectLevel.L,
  M: QRCode.CorrectLevel.M,
  Q: QRCode.CorrectLevel.Q,
  H: QRCode.CorrectLevel.H,
};

/* ── Helpers ── */

/**
 * Returns a formatted date/time string like:
 *   "Mon, 18 Mar 2026  14:32:05"
 */
function getFormattedDateTime() {
  var now  = new Date();
  var pad  = function(n) { return n < 10 ? '0' + n : '' + n; };
  var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var mons = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return days[now.getDay()] + ', '
    + pad(now.getDate()) + ' ' + mons[now.getMonth()] + ' ' + now.getFullYear()
    + '  ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
}

/* ── Generate QR ── */
function generateQR() {
  var input      = document.getElementById('qrInput').value.trim();
  var size       = parseInt(document.getElementById('qrSize').value, 10);
  var ecc        = document.getElementById('qrEcc').value;
  var darkColor  = document.getElementById('colorDark').value;
  var lightColor = document.getElementById('colorLight').value;
  var label      = document.getElementById('qrLabel').value.trim();
  var err        = document.getElementById('errMsg');
  var result     = document.getElementById('result');
  var container  = document.getElementById('qrCanvas');

  /* reset state */
  err.className    = 'err';
  result.className = 'result';

  if (!input) {
    err.textContent = 'Please enter a URL or text to encode.';
    err.className   = 'err show';
    return;
  }

  /* clear previous QR */
  container.innerHTML = '';
  qrInstance = null;

  /* generate via qrcodejs (MIT open source) */
  qrInstance = new QRCode(container, {
    text:         input,
    width:        size,
    height:       size,
    colorDark:    darkColor,
    colorLight:   lightColor,
    correctLevel: ECC_MAP[ecc] || QRCode.CorrectLevel.M,
  });

  /* update live label & datetime display */
  document.getElementById('qrLabelDisplay').textContent = label;
  document.getElementById('qrDateDisplay').textContent  = 'Generated: ' + getFormattedDateTime();

  result.className = 'result show';
  setTimeout(function() {
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 120);
}

/* ── Download QR ── */
/*
  Composites the QR + label + datetime onto an offscreen canvas
  with a solid white background, then saves as PNG.
*/
function downloadQR() {
  var container = document.getElementById('qrCanvas');
  var label     = document.getElementById('qrLabel').value.trim();
  var dateStr   = document.getElementById('qrDateDisplay').textContent;

  var qrCanvas  = container.querySelector('canvas');
  var qrImg     = container.querySelector('img');

  if (!qrCanvas && (!qrImg || !qrImg.src)) {
    alert('Generate a QR code first!');
    return;
  }

  var qrSize       = qrCanvas ? qrCanvas.width : (qrImg.naturalWidth || qrImg.width);
  var pad          = 28;
  var fontSize     = Math.max(14, Math.round(qrSize * 0.062));
  var dateFontSize = Math.max(11, Math.round(qrSize * 0.045));
  var labelH       = label   ? fontSize     + 14 : 0;
  var dateH        = dateStr ? dateFontSize + 10 : 0;
  var totalW       = qrSize  + pad * 2;
  var totalH       = qrSize  + pad * 2 + labelH + dateH;

  var off       = document.createElement('canvas');
  off.width     = totalW;
  off.height    = totalH;
  var ctx       = off.getContext('2d');

  /* always white background */
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalW, totalH);

  function drawAndSave(source) {
    /* QR image */
    ctx.drawImage(source, pad, pad, qrSize, qrSize);

    /* label text */
    if (label) {
      ctx.fillStyle    = '#111111';
      ctx.font         = 'bold ' + fontSize + 'px "Outfit", Arial, sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, totalW / 2, pad + qrSize + labelH / 2 + 4);
    }

    /* date/time text */
    if (dateStr) {
      ctx.fillStyle    = '#777777';
      ctx.font         = dateFontSize + 'px "Outfit", Arial, sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dateStr, totalW / 2, pad + qrSize + labelH + dateH / 2 + 2);
    }

    /* export PNG */
    off.toBlob(function(blob) {
      var safeName = label
        ? label.replace(/[^a-z0-9]/gi, '-').toLowerCase()
        : 'genqr';
      var url = URL.createObjectURL(blob);
      var a   = document.createElement('a');
      a.href     = url;
      a.download = safeName + '-' + Date.now() + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    }, 'image/png');
  }

  if (qrCanvas) {
    drawAndSave(qrCanvas);
  } else {
    if (qrImg.complete) {
      drawAndSave(qrImg);
    } else {
      qrImg.onload = function() { drawAndSave(qrImg); };
    }
  }
}

/* ── Nav toggle (mobile) ── */
function toggleNav() {
  document.getElementById('navMenu').classList.toggle('open');
}

/* ── DOM ready ── */
document.addEventListener('DOMContentLoaded', function() {

  /* Enter key triggers generate */
  document.getElementById('qrInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') generateQR();
  });

  /* Live label preview as user types */
  document.getElementById('qrLabel').addEventListener('input', function() {
    var labelEl = document.getElementById('qrLabelDisplay');
    if (labelEl) labelEl.textContent = this.value.trim();
  });

  /* Close mobile nav on link click */
  document.querySelectorAll('#navMenu a').forEach(function(a) {
    a.addEventListener('click', function() {
      document.getElementById('navMenu').classList.remove('open');
    });
  });

  /* Feature card scroll-entrance animation */
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(en, i) {
      if (en.isIntersecting) {
        en.target.style.animation = 'riseUp .55s ' + (i * 0.12) + 's ease both';
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.feat-card').forEach(function(el) {
    io.observe(el);
  });

});
