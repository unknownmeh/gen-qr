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

/* ── Download QR — HD version ── */
/*
  Strategy:
  - Apply a SCALE multiplier (4×) so even a 220px QR becomes ~1800px output.
  - Regenerate the QR at full HD size (1200px) on a hidden canvas for pixel-perfect dots.
  - Composite: white bg → HD QR → label → date/time → export PNG at full resolution.
  - Uses imageSmoothingEnabled = false to keep QR pixels sharp (no blur).
*/
function downloadQR() {
  var container  = document.getElementById('qrCanvas');
  var label      = document.getElementById('qrLabel').value.trim();
  var dateStr    = document.getElementById('qrDateDisplay').textContent;
  var darkColor  = document.getElementById('colorDark').value;
  var lightColor = document.getElementById('colorLight').value;
  var ecc        = document.getElementById('qrEcc').value;
  var input      = document.getElementById('qrInput').value.trim();

  if (!input) {
    alert('Generate a QR code first!');
    return;
  }

  /* ── HD settings ── */
  var HD_SIZE   = 1200;          /* QR pixel size in the downloaded image  */
  var SCALE     = 4;             /* multiplier for padding & font sizes     */
  var PAD       = 60  * SCALE;  /* white border around QR                  */
  var LABEL_FS  = 36  * SCALE;  /* label font size in px                   */
  var DATE_FS   = 22  * SCALE;  /* date font size in px                    */
  var GAP       = 18  * SCALE;  /* gap between QR bottom and label         */
  var LINE_GAP  = 12  * SCALE;  /* gap between label and date              */

  var labelH    = label   ? LABEL_FS + GAP      : GAP / 2;
  var dateH     = dateStr ? DATE_FS  + LINE_GAP : 0;
  var totalW    = HD_SIZE + PAD * 2;
  var totalH    = HD_SIZE + PAD * 2 + labelH + dateH + PAD / 2;

  /* ── Step 1: render a fresh HD QR onto a hidden canvas ── */
  var hdContainer = document.createElement('div');
  hdContainer.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
  document.body.appendChild(hdContainer);

  var hdQR = new QRCode(hdContainer, {
    text:         input,
    width:        HD_SIZE,
    height:       HD_SIZE,
    colorDark:    darkColor,
    colorLight:   lightColor,
    correctLevel: ECC_MAP[ecc] || QRCode.CorrectLevel.H,
  });

  /* qrcodejs renders async via a short timeout */
  setTimeout(function() {
    var hdCanvas = hdContainer.querySelector('canvas');
    var hdImg    = hdContainer.querySelector('img');
    var source   = hdCanvas || hdImg;

    if (!source) {
      document.body.removeChild(hdContainer);
      alert('Could not render HD QR. Try again.');
      return;
    }

    /* ── Step 2: composite onto final HD canvas ── */
    var off    = document.createElement('canvas');
    off.width  = totalW;
    off.height = totalH;
    var ctx    = off.getContext('2d');

    /* crisp pixel rendering — critical for QR codes */
    ctx.imageSmoothingEnabled = false;

    /* white background */
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);

    function composite(src) {
      /* draw HD QR */
      ctx.drawImage(src, PAD, PAD, HD_SIZE, HD_SIZE);

      /* thin separator line */
      if (label || dateStr) {
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth   = 2 * SCALE;
        ctx.beginPath();
        ctx.moveTo(PAD, PAD + HD_SIZE + GAP / 2);
        ctx.lineTo(totalW - PAD, PAD + HD_SIZE + GAP / 2);
        ctx.stroke();
      }

      var curY = PAD + HD_SIZE + GAP;

      /* label */
      if (label) {
        ctx.fillStyle    = '#111111';
        ctx.font         = 'bold ' + LABEL_FS + 'px "Outfit", "Arial Black", Arial, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'top';
        ctx.letterSpacing = (2 * SCALE) + 'px';
        ctx.fillText(label, totalW / 2, curY);
        curY += LABEL_FS + LINE_GAP;
      }

      /* date/time */
      if (dateStr) {
        ctx.fillStyle    = '#6b7280';
        ctx.font         = DATE_FS + 'px "Outfit", Arial, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'top';
        ctx.letterSpacing = (0.5 * SCALE) + 'px';
        ctx.fillText(dateStr, totalW / 2, curY);
      }

      /* ── Step 3: export at full resolution PNG ── */
      off.toBlob(function(blob) {
        document.body.removeChild(hdContainer);
        var safeName = label
          ? label.replace(/[^a-z0-9]/gi, '-').toLowerCase()
          : 'genqr';
        var url = URL.createObjectURL(blob);
        var a   = document.createElement('a');
        a.href     = url;
        a.download = safeName + '-HD-' + Date.now() + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
      }, 'image/png', 1.0); /* quality=1.0 — lossless PNG */
    }

    if (hdCanvas) {
      composite(hdCanvas);
    } else {
      if (hdImg.complete) {
        composite(hdImg);
      } else {
        hdImg.onload = function() { composite(hdImg); };
      }
    }

  }, 200); /* small delay to let qrcodejs finish rendering */
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
