# 로그인 테스트 정보

## 서버 정보
- URL: http://localhost:3004
- 로그인 페이지: http://localhost:3004/login

## 테스트 계정

### 관리자 계정
- 이메일: admin@jssolar.kr
- 비밀번호: admin123
- 역할: ADMIN

## 테스트 단계

1. 브라우저에서 http://localhost:3004/login 접속
2. 위의 관리자 계정으로 로그인
3. 로그인 성공 시 /dashboard로 리다이렉트
4. 세션 정보에서 role이 ADMIN인지 확인

## 완료된 작업

- [x] bcryptjs 패키지 설치
- [x] Prisma 스키마에 password 필드 추가
- [x] NextAuth를 CredentialsProvider로 변경
- [x] JWT 세션 전략 사용
- [x] 로그인 페이지를 이메일/비밀번호 폼으로 변경
- [x] 회원가입 API 추가 (/api/auth/register)
- [x] 초기 관리자 계정 시드
- [x] 마이그레이션 실행
- [x] 비밀번호 검증 테스트 성공

## 주요 변경 파일

1. prisma/schema.prisma - password 필드 추가
2. src/lib/auth.ts - CredentialsProvider 사용
3. src/types/next-auth.d.ts - JWT 타입 정의
4. src/app/(auth)/login/page.tsx - 로그인 폼
5. src/app/api/auth/register/route.ts - 사용자 생성 API
6. prisma/seed.ts - 초기 데이터 시드
7. package.json - prisma seed 설정

## 추가 사용자 생성

관리자로 로그인 후, 다음 API로 새 사용자 생성 가능:

```bash
POST /api/auth/register
Content-Type: application/json
Authorization: 세션 쿠키 필요

{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name",
  "role": "CLIENT"  // 또는 "ADMIN"
}
```
