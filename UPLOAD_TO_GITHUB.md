# 上架到 GitHub 的指令

把這份文件交給 Claude Code，它會幫你完成所有步驟。

---

## 給 Claude Code 的指令（直接複製貼上）

```
請幫我把 harness-marketplace 這個專案上架到 GitHub。

步驟如下：

1. 確認 gh CLI 已登入（執行 gh auth status）
   - 如果未登入，提示我執行 gh auth login

2. 在 GitHub 建立新的公開 repository，名稱為 harness-marketplace

3. 在本地解壓縮後的 harness-marketplace/ 目錄下：
   - git init
   - git add .
   - git commit -m "initial release: harness-plugin v1.0.0"
   - git branch -M main
   - git remote add origin https://github.com/[我的帳號]/harness-marketplace.git
   - git push -u origin main

4. 完成後告訴我 repository 的網址

注意：
- harness-marketplace.zip 解壓縮後放在桌面或任意目錄都可以
- 請先問我解壓縮後的目錄路徑
- GitHub 帳號請先問我
```

---

## 上架後，更新 README 的安裝指令

上架完成後，把 README.md 裡的：
```
/plugin marketplace add Arthur-dev/harness-marketplace
```

改成你真實的 GitHub 帳號，例如：
```
/plugin marketplace add 你的真實帳號/harness-marketplace
```

可以直接叫 Claude Code 幫你改：
```
請把 README.md 裡的 Arthur-dev 全部替換成 [你的GitHub帳號]
然後 git add . && git commit -m "update readme" && git push
```

---

## 上架後的安裝指令（給其他使用者）

```
/plugin marketplace add 你的帳號/harness-marketplace
/plugin install harness-plugin@harness-marketplace
```

就這樣，兩行搞定。
