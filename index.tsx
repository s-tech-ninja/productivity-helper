import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './src/app/app.component';
import { appConfig } from './src/app/app.config';

// Pass the appConfig as the second argument here!
bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
