# Tikkle

잔돈으로 시작하는 주식 투자 앱. Vue 3 + Vite 웹 앱을 Capacitor로 감싸 안드로이드로 빌드합니다.

- **프론트엔드**: Vue 3, TypeScript, Pinia, Vue Router, Tailwind CSS
- **네이티브**: Capacitor 8 (Android)

## 사전 준비

- **Node.js** 18 이상, npm
- 안드로이드 빌드 시: **JDK 17**, **Android Studio** (Android SDK 포함)

## 환경변수 설정

`.env.example` 를 복사해 `.env` 를 만들고 값을 채웁니다. (`.env` 는 커밋되지 않습니다.)

```bash
cp .env.example .env
```

| 변수 | 용도 |
|---|---|
| `VITE_API_BASE_URL` | 백엔드 API 베이스 URL |
| `VITE_PAYMENT_SECRET_KEY` | 결제 스크래핑 HMAC 서명 시크릿 (백엔드와 동일해야 함) |
| `VITE_SKIP_AUTH` | 개발용 인증 우회 (`true` 시 목 프로필로 실행). 실기기 빌드에서는 `false` |
| `VITE_USE_MOCK` | 데모/스크린샷용 목 데이터 (`true` 시 홈 보유자산·결제 내역을 예시 데이터로 대체). 로그인 여부와 무관 |

## 웹 개발

```bash
npm install
npm run dev          # 개발 서버
npm run build        # 타입체크 + 프로덕션 빌드 → dist/
npm run build:demo   # 목 데이터를 넣은 데모 빌드 (스크린샷용, 아래 참고)
npm run type-check   # 타입 검사만
```

## 데모(스크린샷) 빌드

실기기·AVD에서 예시 데이터로 스크린샷을 찍을 때 씁니다. 홈의 보유자산과 결제
내역이 `src/mocks` 의 예시 데이터로 대체됩니다(로그인은 실제로 해야 합니다).

```bash
npm run build:demo         # .env.demo 의 VITE_USE_MOCK=true 가 적용됨
npx cap sync android
```

운영 빌드(`npm run build`)는 `MODE=production` 이라 **코드 레벨에서 목이 강제로
꺼지고**, 목 데이터는 트리셰이킹되어 번들에 포함되지 않습니다.

## 안드로이드 빌드

안드로이드 네이티브 프로젝트(`android/`)는 저장소에 포함되어 있습니다. 단, 웹 빌드 결과물과
Capacitor 플러그인 설정 파일은 `npx cap sync` 로 **재생성**되므로 커밋되지 않습니다. 따라서
클론 후 처음 빌드하거나 웹 코드를 수정한 뒤에는 반드시 `sync` 를 거쳐야 합니다.

```bash
npm install
npm run build              # dist/ 생성
npx cap sync android       # 웹 자산 + 플러그인 설정을 android/ 로 동기화
```

이후 둘 중 하나로 빌드합니다.

```bash
# 1) 커맨드라인 (디버그 APK)
cd android
./gradlew assembleDebug    # 산출물: android/app/build/outputs/apk/debug/

# 2) Android Studio
#    android/ 폴더를 열고 Run / Build
```

> 디버그 빌드는 별도 서명 키 없이 동작합니다. SDK 경로(`android/local.properties`)는
> Android Studio가 자동 생성하며, 머신마다 다르므로 커밋하지 않습니다.

웹 코드를 수정했다면 `npm run build && npx cap sync android` 를 다시 실행한 뒤 빌드하세요.
