import { Module } from '@nestjs/common';
import { PivotMatrixService } from './pivot-matrix.service';
import { PivotMatrixController } from './pivot-matrix.controller';

@Module({
  controllers: [PivotMatrixController],
  providers: [PivotMatrixService],
  exports: [PivotMatrixService],
})
export class PivotMatrixModule {}
