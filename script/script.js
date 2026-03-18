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

/* ── Selected download format ── */
var selectedFormat = 'png';

function setFormat(btn) {
  /* toggle active class */
  document.querySelectorAll('.fmt-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  btn.classList.add('active');
  selectedFormat = btn.getAttribute('data-fmt');
  /* update button label */
  document.getElementById('dlBtnLabel').textContent =
    'Download HD ' + selectedFormat.toUpperCase();
}

/* ── HD Download QR ── */
/*
  HD Strategy (works on mobile & desktop):
  ─────────────────────────────────────────
  1. Re-render the QR at 2400×2400px in a hidden off-screen div (highest quality).
  2. Composite onto an even larger canvas with padding + label + date.
  3. imageSmoothingEnabled = false  → razor-sharp QR pixels, no anti-alias blur.
  4. Use devicePixelRatio = 1 on the export canvas (we control exact px ourselves).
  5. toBlob with quality=1.0 for PNG / 0.97 for JPG/JPEG.
  6. Mobile-safe download: try <a download>, fall back to window.open(dataURL).
*/
function downloadQR() {
  var input      = document.getElementById('qrInput').value.trim();
  var label      = document.getElementById('qrLabel').value.trim();
  var dateStr    = document.getElementById('qrDateDisplay').textContent;
  var darkColor  = document.getElementById('colorDark').value;
  var lightColor = document.getElementById('colorLight').value;
  var ecc        = document.getElementById('qrEcc').value;
  var dlBtn      = document.getElementById('dlBtn');

  if (!input) {
    alert('Generate a QR code first!');
    return;
  }

  /* ── HD constants — fixed regardless of screen / device ── */
  var QR_PX    = 2400;   /* QR image size in output px          */
  var PAD      = 160;    /* white border around QR              */
  var LABEL_FS = 96;     /* label font size px                  */
  var DATE_FS  = 60;     /* date/time font size px              */
  var GAP      = 60;     /* space between QR bottom and label   */
  var LINE_GAP = 36;     /* space between label and date        */
  var SEP_H    = 4;      /* separator line thickness            */

  var labelH  = label   ? LABEL_FS + GAP + SEP_H : SEP_H + GAP / 2;
  var dateH   = dateStr ? DATE_FS  + LINE_GAP     : 0;
  var totalW  = QR_PX   + PAD * 2;
  var totalH  = QR_PX   + PAD * 2 + labelH + dateH + PAD / 2;

  /* mime type & quality */
  var fmt     = selectedFormat;
  var mime    = (fmt === 'png') ? 'image/png' : 'image/jpeg';
  var quality = (fmt === 'png') ? 1.0         : 0.97;
  var ext     = fmt; /* png / jpg / jpeg */

  /* ── disable button while processing ── */
  dlBtn.disabled = true;
  document.getElementById('dlBtnLabel').textContent = 'Generating HD…';

  /* ── Step 1: render fresh 2400px QR in a hidden off-screen div ── */
  var hdDiv = document.createElement('div');
  hdDiv.style.cssText =
    'position:fixed;left:-99999px;top:-99999px;width:' + QR_PX + 'px;height:' + QR_PX + 'px;overflow:hidden;visibility:hidden;';
  document.body.appendChild(hdDiv);

  /* use ERROR_CORRECT_H for maximum data recovery — best for printing */
  new QRCode(hdDiv, {
    text:         input,
    width:        QR_PX,
    height:       QR_PX,
    colorDark:    darkColor,
    colorLight:   '#ffffff', /* always white QR background for scannability */
    correctLevel: QRCode.CorrectLevel.H,
  });

  /* wait for qrcodejs to finish async canvas render */
  setTimeout(function() {
    var hdCanvas = hdDiv.querySelector('canvas');
    var hdImg    = hdDiv.querySelector('img');
    var source   = hdCanvas || hdImg;

    if (!source) {
      document.body.removeChild(hdDiv);
      dlBtn.disabled = false;
      document.getElementById('dlBtnLabel').textContent =
        'Download HD ' + fmt.toUpperCase();
      alert('HD render failed — please try again.');
      return;
    }

    /* ── Step 2: build final composite canvas ── */
    var off    = document.createElement('canvas');
    off.width  = totalW;
    off.height = totalH;
    var ctx    = off.getContext('2d');

    /* CRITICAL: disable smoothing so QR pixels stay perfectly sharp */
    ctx.imageSmoothingEnabled        = false;
    ctx.webkitImageSmoothingEnabled  = false;
    ctx.mozImageSmoothingEnabled     = false;
    ctx.msImageSmoothingEnabled      = false;

    /* solid white background */
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);

    function composite(src) {
      /* draw HD QR */
      ctx.drawImage(src, PAD, PAD, QR_PX, QR_PX);

      var curY = PAD + QR_PX + GAP;

      /* separator line */
      if (label || dateStr) {
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(PAD * 2, curY - GAP / 2, totalW - PAD * 4, SEP_H);
      }

      /* label */
      if (label) {
        ctx.fillStyle    = '#111111';
        ctx.font         = 'bold ' + LABEL_FS + 'px Outfit, "Arial Black", Arial, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, totalW / 2, curY);
        curY += LABEL_FS + LINE_GAP;
      }

      /* date/time */
      if (dateStr) {
        ctx.fillStyle    = '#6b7280';
        ctx.font         = DATE_FS + 'px Outfit, Arial, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(dateStr, totalW / 2, curY);
      }

      /* ── Step 3: export & trigger download ── */
      var safeName = (label
        ? label.replace(/[^a-z0-9]/gi, '-').toLowerCase()
        : 'genqr') + '-HD-' + Date.now() + '.' + ext;

      off.toBlob(function(blob) {
        /* clean up hidden div */
        if (document.body.contains(hdDiv)) document.body.removeChild(hdDiv);

        /* restore button */
        dlBtn.disabled = false;
        document.getElementById('dlBtnLabel').textContent =
          'Download HD ' + fmt.toUpperCase();

        if (!blob) {
          alert('Export failed. Please try again.');
          return;
        }

        var url = URL.createObjectURL(blob);

        /* ── Mobile-safe download ──
           Most mobile browsers ignore the `download` attribute.
           We try the anchor trick first; if that fails we open
           the blob URL in a new tab so the user can long-press → Save.
        */
        try {
          var a      = document.createElement('a');
          a.href     = url;
          a.download = safeName;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (e) {
          /* fallback: open in new tab */
          window.open(url, '_blank');
        }

        setTimeout(function() { URL.revokeObjectURL(url); }, 5000);

      }, mime, quality);
    }

    if (hdCanvas) {
      composite(hdCanvas);
    } else if (hdImg.complete) {
      composite(hdImg);
    } else {
      hdImg.onload = function() { composite(hdImg); };
    }

  }, 300); /* 300ms — enough for qrcodejs on slow mobile CPUs */
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
