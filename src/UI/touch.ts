import type { Point } from '../Components/position.ts';

export class TouchControls {
  movement: Point = { x: 0, y: 0 };
  private pointer: number | null = null;
  constructor(private readonly pad: HTMLElement) {
    pad.addEventListener('pointerdown', event => {
      if (this.pointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      this.pointer = event.pointerId;
      pad.setPointerCapture(event.pointerId);
      this.track(event);
    });
    pad.addEventListener('pointermove', event => {
      if (event.pointerId === this.pointer) this.track(event);
    });
    for (const event of ['pointerup','pointercancel','lostpointercapture'] as const) {
      pad.addEventListener(event, input => {
        if (input.pointerId === this.pointer) this.reset();
      });
    }
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.reset();
    });
  }

  reset() {
    const pointer = this.pointer;
    this.pointer = null;
    if (pointer !== null && this.pad.hasPointerCapture(pointer)) this.pad.releasePointerCapture(pointer);
    this.movement = { x: 0, y: 0 };
    this.pad.dataset.x = '0';
    this.pad.dataset.y = '0';
  }

  private track(event: PointerEvent) {
    const bounds = this.pad.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    const radius = Math.max(Math.abs(x), Math.abs(y));
    const axis = (delta: number) => radius >= 11 && Math.abs(delta) >= radius * .46 ? Math.sign(delta) : 0;
    this.movement = { x: axis(x), y: axis(y) };
    this.pad.dataset.x = String(this.movement.x);
    this.pad.dataset.y = String(this.movement.y);
  }
}
