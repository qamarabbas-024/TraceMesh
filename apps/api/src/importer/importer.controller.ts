import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ImporterService, ExtractedEntityReport } from './importer.service';

@Controller('import')
export class ImporterController {
  constructor(private readonly importerService: ImporterService) {}

  @Post('text')
  @HttpCode(HttpStatus.OK)
  importText(@Body() body: { text: string }): ExtractedEntityReport {
    return this.importerService.extractEntitiesFromText(body.text, 'text');
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  importChat(@Body() body: any): ExtractedEntityReport {
    return this.importerService.parseChatExport(body);
  }
}
