import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ScrollPositionService {
  private savedY: number | null = null;

  save(y: number): void {
    this.savedY = y;
  }

  consume(): number | null {
    const y = this.savedY;
    this.savedY = null;
    return y;
  }
}
