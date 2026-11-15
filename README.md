<div align=center>

# Lumina

**Folia + 일반 Paper 플러그인 호환 모드** · *Folia with a compatibility mode for regular Paper plugins*

</div>

Lumina는 [Folia](https://github.com/PaperMC/Folia)를 기반으로 한 비공식 포크입니다.
`folia-supported: true`가 없는 일반 Paper 플러그인도 로딩되며, 그런 플러그인의 동기 코드는
모든 지역 틱을 안전점에서 멈춘 상태(stop-the-world)에서 실행됩니다.

Lumina is an unofficial fork of Folia. Plugins without `folia-supported: true` still load;
their synchronous code runs while every region tick is paused at a safepoint.

- 자세한 설명 / Details: [LUMINA.md](LUMINA.md)
- 다운로드 / Downloads: [Releases](../../releases)
- 원본 Folia README: [README-FOLIA.md](README-FOLIA.md)

> Lumina는 PaperMC와 관련이 없으며, PaperMC의 지원을 받지 않습니다. 문제는 이 저장소에 알려 주세요.
> Lumina is not affiliated with or supported by PaperMC. Please report issues here, not upstream.

## 빌드 / Build

```bash
./gradlew applyAllPatches
./gradlew createPaperclipJar
```

라이선스는 원본과 같습니다 (패치: [PATCHES-LICENSE](PATCHES-LICENSE), GPLv3).
