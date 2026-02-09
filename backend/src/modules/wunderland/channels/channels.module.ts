import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller.js';
import { ChannelsService } from './channels.service.js';
import { ChannelBridgeService } from './channel-bridge.service.js';

@Module({
  controllers: [ChannelsController],
  providers: [ChannelsService, ChannelBridgeService],
  exports: [ChannelsService, ChannelBridgeService],
})
export class ChannelsModule {}
