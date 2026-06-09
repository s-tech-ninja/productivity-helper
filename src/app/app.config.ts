import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import { routes } from './app.routes'; // Assuming app.routes.ts defines your routes

export const appConfig: ApplicationConfig = {
  providers: [
    // Add provideRouter to set up your routing
    provideRouter(routes, withComponentInputBinding(), withHashLocation()),
    // ... your other application-level providers (e.g., HttpClientModule)
  ]
};