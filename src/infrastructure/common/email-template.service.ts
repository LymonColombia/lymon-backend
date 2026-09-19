import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'node:path';
import * as fs from 'node:fs';

@Injectable()
export class EmailTemplateService {
  private readonly templatesDir = path.join(
    __dirname,
    '..',
    'common',
    'templates',
  );
  private readonly supportUrl: string;

  constructor(private readonly configService: ConfigService) {
    const supportUrl = this.configService.get<string>('SUPPORT_URL');
    if (!supportUrl) {
      throw new Error(
        'SUPPORT_URL environment variable is not configured. Please add SUPPORT_URL to your .env file.',
      );
    }
    this.supportUrl = supportUrl;
  }

  resolvePlaceholders(
    text: string,
    variables: Record<string, unknown> = {},
  ): string {
    if (!text) return '';
    if (!text.includes('{{')) {
      return text;
    }

    const parts: string[] = [];
    let cursor = 0;

    while (cursor < text.length) {
      const open = text.indexOf('{{', cursor);
      if (open === -1) {
        parts.push(text.slice(cursor));
        break;
      }

      parts.push(text.slice(cursor, open));

      const close = text.indexOf('}}', open + 2);
      if (close === -1) {
        parts.push(text.slice(open));
        break;
      }

      const key = text.slice(open + 2, close).trim();
      const value = key ? variables[key] : undefined;
      parts.push(
        value !== undefined && value !== null
          ? String(value as string | number | boolean)
          : '',
      );

      cursor = close + 2;
    }

    return parts.join('');
  }

  renderTemplate(
    templateName: string,
    variables: Record<string, unknown>,
  ): string {
    const templatePath = path.join(this.templatesDir, `${templateName}.html`);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }
    const html = fs.readFileSync(templatePath, 'utf-8');
    return this.resolvePlaceholders(html, variables);
  }

  renderVerifyEmailTemplate(verificationUrl: string): string {
    return this.renderTemplate('verify-email', {
      verificationUrl,
      supportUrl: this.supportUrl,
    });
  }

  renderRecoverPasswordTemplate(recoveryUrl: string): string {
    return this.renderTemplate('recover-password', {
      recoveryUrl,
      supportUrl: this.supportUrl,
    });
  }

  renderLowStockAlertTemplate(variables: {
    ownerName: string;
    tenantName: string;
    propertyName: string;
    itemName: string;
    itemSku: string;
    currentStock: number;
    minStock: number;
    difference: number;
  }): string {
    return this.renderTemplate('low-stock-alert', {
      ownerName: variables.ownerName,
      tenantName: variables.tenantName,
      propertyName: variables.propertyName,
      itemName: variables.itemName,
      itemSku: variables.itemSku,
      currentStock: variables.currentStock.toString(),
      minStock: variables.minStock.toString(),
      difference: Math.abs(variables.difference).toString(),
      supportUrl: this.supportUrl,
    });
  }

  renderShiftUpdatedTemplate(variables: {
    name: string;
    startDate: Date;
    endDate: Date | null;
    startHour: string;
    endHour: string;
    propertyName: string;
    notes: string | null;
  }): string {
    return this.renderTemplate('shift-updated', {
      name: variables.name,
      startDate: variables.startDate.toISOString().slice(0, 10),
      endDate: variables.endDate
        ? variables.endDate.toISOString().slice(0, 10)
        : 'No end date',
      startHour: variables.startHour,
      endHour: variables.endHour,
      propertyName: variables.propertyName,
      notesBlock: variables.notes
        ? `<p><strong>Notes:</strong> ${variables.notes}</p>`
        : '',
    });
  }
}
