import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Sse,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { CollaborationService, CollabEvent } from './collaboration.service';

export interface PostCollabEventDto {
  runId: string;
  type: CollabEvent['type'];
  analystId: string;
  analystName: string;
  payload: any;
}

@Controller('collab')
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Sse('stream/:runId')
  streamEvents(
    @Param('runId') runId: string,
    @Req() req: Request,
  ): Observable<{ data: CollabEvent }> {
    const stream = this.collaborationService.getEventStreamForRoom(runId);
    req.on('close', () => {
      // Clean up on client disconnect
      const analystId = (req.headers['x-analyst-id'] as string) || 'sse-client';
      this.collaborationService.removePresence(runId, analystId, 'Analyst');
    });
    return stream;
  }

  @Post('event')
  @HttpCode(HttpStatus.OK)
  emitEvent(@Body() body: PostCollabEventDto) {
    return this.collaborationService.broadcastEvent({
      runId: body.runId,
      type: body.type,
      analystId: body.analystId || 'analyst-anon',
      analystName: body.analystName || 'Senior Investigator',
      payload: body.payload,
    });
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  joinRoom(@Body() body: { runId: string; analystId: string; analystName: string }) {
    return this.collaborationService.registerPresence(
      body.runId,
      body.analystId,
      body.analystName,
    );
  }

  @Post('leave')
  @HttpCode(HttpStatus.OK)
  leaveRoom(@Body() body: { runId: string; analystId: string; analystName: string }) {
    return this.collaborationService.removePresence(
      body.runId,
      body.analystId,
      body.analystName,
    );
  }
}
