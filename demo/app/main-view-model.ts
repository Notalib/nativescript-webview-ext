import { Observable } from 'tns-core-modules/data/observable';
import { WebviewExt } from 'nativescript-webview-ext';

export class HelloWorldModel extends Observable {
  public message: string;
  private webviewExt: WebviewExt;

  constructor() {
    super();

    this.webviewExt = new WebviewExt();
    this.message = this.webviewExt.message;
  }
}
