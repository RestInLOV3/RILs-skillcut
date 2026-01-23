# RILs Skillcut

Foundry VTT 13 / D&D 5e용 스킬컷 연출 모듈입니다.

## 기능

- 캐릭터별 스킬컷 이미지 매핑 관리
- 좌/우 방향에서 슬라이드 인 애니메이션
- SocketLib을 통해 모든 클라이언트 동기화

## 설치

### 필수 의존성

- [SocketLib](https://github.com/farling42/foundryvtt-socketlib) - 클라이언트 간 동기화에 필요

### 설치 방법

1. Foundry VTT의 **Add-on Modules** 탭에서 **Install Module** 클릭
2. Manifest URL 입력:
   ```
   https://github.com/RestInLOV3/RILs-skillcut/releases/latest/download/module.json
   ```
3. **Install** 클릭

## 사용법

### 1. 캐릭터 이미지 매핑 설정

1. **Game Settings** → **Module Settings** → **RILs Skillcut** → **편집하기**
2. 캐릭터 이름과 이미지 경로를 입력
3. **저장** 클릭

이미지 경로 예시:

- `modules/your-module/images/character1.png`
- `worlds/your-world/assets/skillcut/hero.webp`
- `https://i.imgur.com/imglink.png`

### 2. 스킬컷 실행

1. 채팅창 하단의 **★ 버튼** 클릭
2. 좌측/우측에서 등장할 캐릭터 선택
3. **선택 완료** 클릭

선택한 캐릭터들이 모든 플레이어 화면에서 동시에 슬라이드 인됩니다.

## 호환성

| 항목          | 버전 |
| ------------- | ---- |
| Foundry VTT   | 13   |
| D&D 5e System | 지원 |

## 라이선스

MIT License

## 제작자

**RestInLOV3**
