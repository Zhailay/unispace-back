/**
 * Исправление неправильных казахских символов после Tilmash.
 * Прямой порт из webTestUpload/lib/tilmashFix.js.
 */
const good = 'әіңғүұқөһӘІҢҒҮҰҚӨҺ';
const bad  = 'јіѕєїўќґћЈІЅЄЇЎЌҐЋ';

function tilmashFix(str) {
  for (let i = 0; i < bad.length; i++) {
    str = str.split(bad[i]).join(good[i]);
  }
  return str;
}

module.exports = { tilmashFix };
