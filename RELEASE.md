# 새 버전 배포 방법 (이조 영업관리)

설치된 앱은 실행할 때 GitHub Releases(poikloo/ijo-sales-app)의 `latest.yml`을 확인해 자동 업데이트합니다.

```bash
# 1) 버전 올리기 (예: 1.1.0 -> 1.2.0)
npm version 1.2.0 --no-git-tag-version

# 2) 윈도우 설치 파일 빌드 (리눅스에서는 wine 필요)
npm ci && npm run dist        # = electron-builder --win --x64 --publish never

# 3) 커밋 후 릴리스 생성 (세 파일 모두 반드시 업로드)
V=$(node -p "require('./package.json').version")
git commit -am "v$V" && git tag "v$V" && git push && git push --tags
gh release create "v$V" --repo poikloo/ijo-sales-app --title "v$V" --notes "변경 내용" \
  "dist/ijo-sales-Setup-$V.exe" "dist/ijo-sales-Setup-$V.exe.blockmap" dist/latest.yml

# 4) 확인
curl -sL https://github.com/poikloo/ijo-sales-app/releases/latest/download/latest.yml
```

주의
- 저장소는 공개(public)입니다. 사용자 데이터(data.json), 토큰, dist/ 결과물은 절대 커밋하지 마세요(.gitignore 처리됨).
- 설치 파일 이름은 ASCII(`ijo-sales-Setup-x.y.z.exe`)로 유지하세요. 한글 파일명은 GitHub에서 바뀌어 업데이트가 깨집니다.
- 릴리스는 Draft/Pre-release가 아닌 일반 릴리스여야 `latest`로 인식됩니다.
- 코드 서명이 없어 첫 설치 시 SmartScreen 경고가 뜹니다(추가 정보 → 실행).
