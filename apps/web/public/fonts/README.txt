Self-hosted fonts; production makes no Google Fonts request.
Upstream: google/fonts main, retrieved 2026-11-06:
  ofl/inter/Inter[opsz,wght].ttf
  ofl/pixelifysans/PixelifySans[wght].ttf
Licenses: inter-OFL.txt and pixelifysans-OFL.txt (upstream OFL.txt).
WOFF containers generated losslessly using the already-installed fontTools:
  f = TTFont(input_ttf); f.flavor = 'woff'; f.save(output_woff)
WOFF2 was unavailable (Brotli extension missing); no dependency was added.
No glyph subsetting or name modification. System fallbacks cover missing glyphs.
Both files are precached by sw.js; font-display: swap.
inter.woff: 457780 bytes; sha256 616093e36b7357cbc7cb3670eb53914e9f0784f7e5fe68b9b2f82f817f7ee312
pixelifysans.woff: 30168 bytes; sha256 0ebe7fc03fb22367f89ca1e95cecaa739d959ca7e9b2da721a33d1e37da3b860
License wording is unchanged; line endings and trailing whitespace normalized for git-am round trips.
