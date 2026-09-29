import { Injectable } from '@angular/core';

export type HeroPalette = {
  primary: string;
  secondary: string;
  glow: string;
};

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

@Injectable({
  providedIn: 'root',
})
export class HeroPaletteService {
  async buildLogoHeroBackground(
    imageUrl: string | null | undefined,
    fallback: HeroPalette,
  ): Promise<string> {
    if (!imageUrl) {
      return this.composeHeroBackground(fallback);
    }

    try {
      const palette = await this.extractHeroPalette(imageUrl);
      return this.composeHeroBackground(palette);
    } catch (error) {
      console.warn('Palette extraction failed for member logo:', imageUrl, error);
      return this.composeHeroBackground(fallback);
    }
  }

  composeHeroBackground(palette: HeroPalette): string {
    return `
      radial-gradient(circle at 10% 8%, ${palette.glow} 0%, rgba(255,255,255,0) 34%),
      radial-gradient(circle at 86% 16%, ${palette.glow} 0%, rgba(255,255,255,0) 30%),
      linear-gradient(135deg, ${palette.primary} 0%, ${palette.secondary} 58%, #081326 100%)
    `.trim();
  }

  async extractHeroPalette(imageUrl: string): Promise<HeroPalette> {
    const image = await this.loadImageForPalette(imageUrl);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;

    if (!ctx) {
      throw new Error('Canvas context unavailable');
    }

    const sampleSize = 32;
    canvas.width = sampleSize;
    canvas.height = sampleSize;

    ctx.drawImage(image, 0, 0, sampleSize, sampleSize);

    const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];

      if (alpha < 140) {
        continue;
      }

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const brightness = (r * 299 + g * 587 + b * 114) / 1000;

      // Ignore presque-blanc, presque-noir, gris trop neutre.
      // Les logos ont souvent beaucoup de contour blanc/noir.
      if (brightness < 24 || brightness > 238) {
        continue;
      }

      const hsl = this.rgbToHsl({ r, g, b });

      if (hsl.s < 8 && brightness > 155) {
        continue;
      }

      const key = `${this.quantize(r)}-${this.quantize(g)}-${this.quantize(b)}`;
      const current = buckets.get(key);

      if (current) {
        current.count += 1;
        current.r += r;
        current.g += g;
        current.b += b;
      } else {
        buckets.set(key, { count: 1, r, g, b });
      }
    }

    const ranked = [...buckets.values()]
      .map((bucket) => {
        const color = {
          r: Math.round(bucket.r / bucket.count),
          g: Math.round(bucket.g / bucket.count),
          b: Math.round(bucket.b / bucket.count),
        };

        const hsl = this.rgbToHsl(color);

        return {
          count: bucket.count,
          color,
          score: bucket.count * (1 + hsl.s / 100),
        };
      })
      .sort((a, b) => b.score - a.score);

    if (ranked.length === 0) {
      throw new Error('No usable colors found');
    }

    const primaryBase = ranked[0].color;

    const secondaryBase =
      ranked.find((entry) => this.colorDistance(entry.color, primaryBase) > 48)?.color ??
      ranked[Math.min(1, ranked.length - 1)]?.color ??
      primaryBase;

    return {
      primary: this.normalizeHeroColor(primaryBase, {
        minSaturation: 22,
        maxSaturation: 78,
        minLightness: 18,
        maxLightness: 34,
        alpha: 0.94,
      }),
      secondary: this.normalizeHeroColor(secondaryBase, {
        minSaturation: 18,
        maxSaturation: 64,
        minLightness: 10,
        maxLightness: 24,
        alpha: 0.96,
      }),
      glow: this.normalizeHeroGlow(primaryBase),
    };
  }

  private loadImageForPalette(imageUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      // Important pour canvas. Pour tes assets locaux ça va fonctionner.
      // Pour certains SVG NHL externes, ça peut échouer selon CORS.
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Unable to load image: ${imageUrl}`));

      img.src = imageUrl;
    });
  }

  private quantize(value: number): number {
    return Math.floor(value / 32) * 32;
  }

  private colorDistance(a: RgbColor, b: RgbColor): number {
    const dr = a.r - b.r;
    const dg = a.g - b.g;
    const db = a.b - b.b;

    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  private normalizeHeroColor(
    color: RgbColor,
    options: {
      minSaturation: number;
      maxSaturation: number;
      minLightness: number;
      maxLightness: number;
      alpha: number;
    },
  ): string {
    const hsl = this.rgbToHsl(color);

    const saturation = this.clamp(hsl.s, options.minSaturation, options.maxSaturation);
    const lightness = this.clamp(hsl.l * 0.72, options.minLightness, options.maxLightness);

    return `hsl(${Math.round(hsl.h)} ${Math.round(saturation)}% ${Math.round(lightness)}% / ${options.alpha})`;
  }

  private normalizeHeroGlow(color: RgbColor): string {
    const hsl = this.rgbToHsl(color);

    const saturation = this.clamp(Math.max(hsl.s, 32), 32, 82);
    const lightness = this.clamp(Math.max(hsl.l, 46), 46, 66);

    return `hsl(${Math.round(hsl.h)} ${Math.round(saturation)}% ${Math.round(lightness)}% / 0.28)`;
  }

  private rgbToHsl({ r, g, b }: RgbColor): { h: number; s: number; l: number } {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;

    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;

    let h = 0;
    const l = (max + min) / 2;
    let s = 0;

    if (delta !== 0) {
      s = delta / (1 - Math.abs(2 * l - 1));

      switch (max) {
        case red:
          h = 60 * (((green - blue) / delta) % 6);
          break;
        case green:
          h = 60 * ((blue - red) / delta + 2);
          break;
        default:
          h = 60 * ((red - green) / delta + 4);
          break;
      }
    }

    if (h < 0) {
      h += 360;
    }

    return {
      h,
      s: s * 100,
      l: l * 100,
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
