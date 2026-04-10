# Odd One Out

React + Vite + TypeScript で実装した、4 枚の画像から 1 つだけ異なるものを選ぶ簡単なアプリケーションです。

## 概要

- `object_images/` 配下の画像カテゴリから、ある 1 フォルダから 3 枚、別の 1 フォルダから 1 枚をランダムに選択します。
- 4 枚の画像を画面いっぱいに 2x2 で表示します。
- 異なる画像をクリックすると正誤判定を行い、短い表示のあと次の問題に進みます。

## 必要なデータ

このアプリを使用するには、画像データセットが必要です。

`image_THINGS.zip` を以下からダウンロードしてください:

<https://osf.io/jum2f/files/osfstorage>

ダウンロードした zip を展開し、このリポジトリ直下で `object_images/` ディレクトリが存在する状態にしてください。

想定構成:

```text
OddOneOut/
  object_images/
    apple/
    airplane/
    ...
  src/
  package.json
```

## セットアップ

```bash
npm install
```

## 開発サーバー起動

```bash
npm run dev
```

## ビルド

```bash
npm run build
```

## 補足

- 画像数が非常に多いため、初回起動やビルドには少し時間がかかることがあります。
- `object_images/` が存在しない、または想定外の構成になっている場合、アプリは正常に動作しません。
