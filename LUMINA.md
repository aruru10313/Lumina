# Lumina (루미나)

Folia 1.20.6 기반 서버입니다. Folia에 **일반 Paper 플러그인 호환 모드(세상 멈추기, stop-the-world)**를 더했어요.

- 서버 이름(`/version`, 시작 로그)은 **Lumina**로 나옵니다. 서버가 켜질 때 LUMINA 로고가 색 그라데이션으로 출력돼요.
- `Brand-Id`는 `papermc:folia`로 그대로 뒀습니다. 플러그인이 Folia인지 확인해서 Folia 스케줄러를 쓰는 동작이 계속 맞게 돌아가도록 하기 위해서예요.

- `folia-supported: true`가 있는 플러그인은 Folia처럼 지역마다 병렬로 돕니다.
- 그 표시가 없는 **일반 Paper 플러그인**도 로딩됩니다. 이런 플러그인의 동기 코드는 **모든 지역 틱이 안전점에서 멈춘 상태**에서 혼자 실행됩니다.

## 동작 방식

`folia-server/src/main/java/io/papermc/paper/threadedregions/LegacyCompat.java`

| 상황 | 처리 |
|---|---|
| 지역 틱 / 작업 묶음 실행 | `enterRegion()` / `exitRegion()`로 "실행 중" 표시 |
| 일반 플러그인이 듣는 **동기 이벤트** | 그 이벤트 전체를 `runExclusive`로 실행 |
| `BukkitScheduler` 동기 작업 | 전역 틱마다 확인해서, 실행할 작업이 있는 틱에만 `runExclusive` |
| 비동기 작업 (`runTaskAsynchronously` 등) | 기존 Paper 방식 그대로 |
| 모든 명령어 (바닐라 / 플러그인) | `runExclusive` 안에서 실행 |
| 일반 플러그인의 `onEnable` / `onDisable` | `runExclusive` 안에서 실행 |
| 다른 지역의 블록 수정 / 엔티티 추가 / teleport | 스레드의 "현재 지역"을 그 지역으로 잠깐 바꿔서 실행 (`inRegionAt`) |
| 로드되지 않은 청크의 동기 로딩 | 잠금을 잠깐 풀고 요청. 기다리는 스레드가 그 지역 작업과 전역 청크 작업을 직접 처리 (틱 스레드가 1~2개뿐이어도 멈추지 않음) |
| 서버 시작 | 호환 모드에서는 지역 스레드를 POSTWORLD 플러그인 켜기 **전에** 시작. 전역 틱(플레이어 접속, 콘솔)은 원래대로 그다음에 시작 |

`runExclusive` 동작:
1. 다른 지역들이 지금 돌고 있는 틱을 끝낼 때까지 기다립니다. 새 틱은 시작하지 못하게 막아요.
2. 혼자 실행하는 동안에는 스레드 소유 검사(`TickThread.isTickThreadFor*`, `isGlobalTickThread`)를 통과시킵니다.
3. 엔티티나 청크가 추가·제거되면, 해당 위치를 **소유한 지역의 데이터**에 기록합니다. 다른 지역의 엔티티를 스폰해도 올바른 지역에 들어가요.
4. 지역 스레드끼리 동시에 요청해도 데드락이 나지 않습니다. 기다리는 동안 자기 자신을 "멈춤"으로 표시하기 때문이에요.

## 다시 켠 것

- **플러그인 로딩**: `folia-supported`가 없어도 로딩합니다. 콘솔에 경고를 남겨요.
- **Bukkit API**: `BukkitScheduler`, 동기 `teleport()`(내부에서 `teleportAsync`로 넘김), 스코어보드 API(`registerNewTeam`, `getNewScoreboard` 등), 비동기 스레드에서 호출하는 `getTPS()`
- **바닐라 명령어**: `bossbar`, `clone`, `data`, `debug`, `dialog`, `function`, `item`, `loot`, `return`, `schedule`, `scoreboard`, `spectate`, `spreadplayers`, `tag`, `team`, `teammsg`, `tick`, `trigger`, `waypoint`
- **Paper / Spigot 명령어**: `/mspt`(명령을 친 사람이 있는 지역 기준), `/restart`
- `/tps`는 Folia의 지역별 `/tps`를 그대로 씁니다.

## 아직 꺼져 있는 것 (이유)

| 명령어 | 이유 |
|---|---|
| `/reload` (바닐라), `/datapack` | 데이터팩을 다시 불러오는 작업이 메인 스레드 큐를 쓰는데, Folia에서는 그 큐가 돌지 않아서 서버가 멈춥니다 |
| `/save-all` | 저장이 지역 단위로 이뤄집니다. Folia 자동 저장과 `/stop` 시 저장은 정상 동작합니다 |
| `/perf`, `/test` | 메인 스레드 프로파일러와 게임테스트 전용입니다 |
| `createWorld` / `unloadWorld` API | Folia 원본에서도 아직 구현되지 않았습니다 |

## 설정 (JVM 옵션)

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `-Dfolia.legacyCompat=false` | `true` | 호환 모드 전체를 끕니다 (순정 Folia 동작) |
| `-Dfolia.legacyCommands=false` | `true` | 다시 켠 명령어와 명령어 전역 실행만 끕니다 |
| `-Dfolia.legacyCompat.slowWarnMs=100` | `100` | 전역 실행이 이 시간(ms)보다 오래 걸리면 경고를 남깁니다 |

## 알려진 위험

- 일반 플러그인이 많이 일할수록 서버가 **단일 스레드처럼** 느려집니다. 매 틱 반복 작업이 있거나 이벤트를 많이 받는 플러그인이 대표적이에요.
- 지역 A가 틱 도중 이벤트에서 기다리는 동안, 다른 스레드가 지역 A의 엔티티를 바꿀 수 있습니다. Paper에서 이벤트 안에서 엔티티를 바꾸는 것과 비슷하지만 100% 같지는 않습니다.
- Folia 내부 잠금을 쥔 상태에서 일반 플러그인 이벤트가 발생하면 이론상 데드락이 날 수 있습니다. 서버가 멈추면 Folia 워치독이 스레드 덤프를 남깁니다.
- NMS나 CraftBukkit 내부를 직접 건드리는 플러그인은 Folia 내부 구조가 달라서 깨질 수 있습니다.

## 빌드

```bash
./gradlew applyPatches
./gradlew createMojmapPaperclipJar
```
결과물: `build/libs/folia-paperclip-1.20.6-R0.1-SNAPSHOT-mojmap.jar`

Windows에서 빌드할 때는 git의 `core.autocrlf=false`와 git 사용자 정보가 필요합니다.

## 테스트

`compat-test/`는 Folia 미지원 테스트 플러그인입니다. 동기 반복 작업, 비동기 작업, 서로 멀리 떨어진 세 지역의 블록 수정, 엔티티 스폰과 teleport, 스코어보드, `dispatchCommand`를 확인하고, 결과를 `[LegacyTest] PASS/FAIL`로 로그에 남깁니다.

## 테스트 결과 (26.3, Windows)

### 테스트 플러그인 (`compat-test/`): 11/11 PASS
플러그인 로딩, 비동기 작업, 동기 작업(primaryThread=true), 서로 다른 세 지역(아직 로드 안 된 청크)의 블록 수정, 다른 지역에 엔티티 스폰, 동기 teleport, `getEntities()`, 스코어보드 팀, 새 스코어보드와 objective, `dispatchCommand`, 반복 작업(140틱, TPS 18~20)

### 실제 플러그인 18개: 전부 에러 없이 켜짐 (시작 18초)
- **Folia 미지원(호환 모드)**: Multiverse-Core 5.8.2, AdvancedPortals 2.8.0, NoLeavesDecay, URLCustomDiscs 외 비공개 플러그인
- **Folia 지원(같이 돌림)**: LuckPerms, WorldEdit, WorldGuard, PlaceholderAPI, packetevents, Oraxen, BetterModel

명령어 확인 결과:
- 정상 동작: `mv list`, `mv version`, `portal list`, `lp info`, `papi version`, `version`, `/tps`, `/mspt`
- Folia가 꺼뒀던 명령어도 정상 동작: `scoreboard objectives add`, `team add`, `bossbar add`
- `setblock` / `clone` / `data`는 "That position is not loaded"를 냈습니다. Paper와 같은 바닐라 동작이에요(로드 안 된 위치).

### 아직 확인하지 못한 것
- 실제 마인크래프트 클라이언트로 접속한 상태의 테스트(펫이 따라다니는지, 포탈 이동 등)
- 플레이어가 많을 때의 성능
- Multiverse로 **새 월드 만들기**: Folia 원본에서도 `createWorld`가 막혀 있습니다
