import { Plugin } from "obsidian";

import setupCM6 from "./cm6";
import GoToDownloadModal from "./install-guide";
import { cut, cutForSearch, initJieba } from "./jieba";
import { createSegmentation, type Segmentation } from "./segmentation";
import { ChsPatchSettingTab, DEFAULT_SETTINGS } from "./settings";

export default class CMChsPatch extends Plugin {
  libName = "jieba_rs_wasm_bg.wasm";
  segmentation!: Segmentation;
  async loadLib(): Promise<ArrayBuffer | null> {
    if (!(await app.vault.adapter.exists(this.libPath, true))) {
      return null;
    }
    const buf = await app.vault.adapter.readBinary(this.libPath);
    return buf;
  }
  async libExists(): Promise<boolean> {
    return await app.vault.adapter.exists(this.libPath, true);
  }
  async saveLib(ab: ArrayBuffer): Promise<void> {
    await app.vault.adapter.writeBinary(this.libPath, ab);
  }
  get libPath(): string {
    return [app.vault.configDir, this.libName].join("/");
  }

  async onload() {
    this.addSettingTab(new ChsPatchSettingTab(this));

    await this.loadSettings();

    if (await this.loadSegmenter()) {
      this.segmentation = createSegmentation({
        cut: this.cut.bind(this),
      });
      setupCM6(this, this.segmentation);
      console.info("editor word splitting patched");
    }
  }

  settings = DEFAULT_SETTINGS;

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  segmenter?: Intl.Segmenter;

  async loadSegmenter(): Promise<boolean> {
    if (!this.settings.useJieba && window.Intl?.Segmenter) {
      this.segmenter = new Intl.Segmenter("zh-CN", {
        granularity: "word",
      });
      console.info("window.Intl.Segmenter loaded");
      return true;
    }

    const jiebaBinary = await this.loadLib();
    if (!jiebaBinary) {
      new GoToDownloadModal(this).open();
      return false;
    }
    await initJieba(jiebaBinary, this.settings.dict);
    console.info("Jieba loaded");
    return true;
  }

  cut(text: string, { search = false }: { search?: boolean } = {}): string[] {
    if (!this.settings.useJieba && this.segmenter) {
      return Array.from(this.segmenter.segment(text)).map((seg) => seg.segment);
    }
    if (search) {
      return cutForSearch(text, this.settings.hmm);
    }
    return cut(text, this.settings.hmm);
  }
}
