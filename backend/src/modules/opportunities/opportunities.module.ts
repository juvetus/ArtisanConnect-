import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OPPORTUNITY_ENTITIES } from '../../entities/opportunity.entity.js';
import { EmailModule } from '../email/email.module.js';
import { WhatsAppModule } from '../whatsapp/whatsapp.module.js';
import { OpportunitiesController } from './opportunities.controller.js';
import { OpportunitiesService } from './opportunities.service.js';
import { OpportunityAlertsService } from './opportunity-alerts.service.js';

@Module({
  imports: [TypeOrmModule.forFeature(OPPORTUNITY_ENTITIES), EmailModule, WhatsAppModule],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService, OpportunityAlertsService],
})
export class OpportunitiesModule {}
