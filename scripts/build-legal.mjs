/**
 * docs/*.md → site/{terms,privacy}.html
 *
 * 약관·방침의 단일 출처는 docs/ 다 (앱은 src/utils/legal.ts 가 ?raw 로 같은
 * 파일을 읽는다). 사이트가 세 번째 사본이 되지 않도록 여기서 생성한다.
 * 문서를 고쳤으면 `npm run build:site` 를 다시 돌릴 것.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { marked } from 'marked'

const DOCS = [
  { src: 'docs/terms-of-service.md', out: 'site/terms.html', title: '이용약관' },
  { src: 'docs/privacy-policy.md', out: 'site/privacy.html', title: '개인정보처리방침' },
]

const page = (title, body) => `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} — Tikkle</title>
    <link rel="stylesheet" href="./site.css" />
    <link rel="stylesheet" href="./legal.css" />
  </head>
  <body>
    <nav>
      <div class="wrap">
        <a class="logo" href="./index.html">Tikkle</a>
        <div class="nav-links">
          <a href="./terms.html">이용약관</a>
          <a href="./privacy.html">개인정보처리방침</a>
        </div>
      </div>
    </nav>
    <main class="wrap doc">
${body}
    </main>
    <footer>
      <div class="wrap">
        <a class="logo" href="./index.html">Tikkle</a>
        <span class="copy">© 2026 Tikkle</span>
      </div>
    </footer>
  </body>
</html>
`

for (const { src, out, title } of DOCS) {
  writeFileSync(out, page(title, marked.parse(readFileSync(src, 'utf8'))))
  console.log(`${src} → ${out}`)
}
