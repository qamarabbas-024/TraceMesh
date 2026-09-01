import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PivotMatrixService } from './pivot-matrix.service';
import { DiscoveredEntity } from '@tracemesh/shared';

@Controller('matrix')
export class PivotMatrixController {
  constructor(private readonly pivotMatrixService: PivotMatrixService) {}

  @Get('search')
  search(@Query('q') q: string) {
    return this.pivotMatrixService.searchMatrix(q || '');
  }

  @Post('index')
  @HttpCode(HttpStatus.OK)
  indexEntities(@Body() body: { runId: string; entities: DiscoveredEntity[] }) {
    this.pivotMatrixService.indexRunEntities(body.runId, body.entities || []);
    return { status: 'indexed', count: (body.entities || []).length };
  }
}
