import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ImporterService, ExtractedEntityReport } from './importer.service';

@Controller('import')
export class ImporterController {
  constructor(private readonly importerService: ImporterService) {}

  @Post('text')
  @HttpCode(HttpStatus.OK)
  importText(@Body() body: any): ExtractedEntityReport {
    const rawText = typeof body === 'string' ? body : (body?.text ?? body?.content ?? '');
    return this.importerService.extractEntitiesFromText(String(rawText), 'text');
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  importChat(@Body() body: any): ExtractedEntityReport {
    return this.importerService.parseChatExport(body || {});
  }
}
