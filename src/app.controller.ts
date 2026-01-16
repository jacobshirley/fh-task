import { Controller } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  private readonly appService: AppService;

  constructor(appService: AppService) {
    this.appService = appService;
  }
}
