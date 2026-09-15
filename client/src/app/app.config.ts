import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAuth0, authHttpInterceptorFn } from '@auth0/auth0-angular';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authHttpInterceptorFn])),

    provideAuth0({
      domain: 'dev-5dl4dwpvi03slphz.us.auth0.com',
      clientId: 'PUVJJa0MmFQ0piJNcznfjDl8cYRoKs6p',

      authorizationParams: {
        redirect_uri: window.location.origin,
        audience: 'https://api.weathermethis.com',
      },

      httpInterceptor: {
        allowedList: [
          `${environment.apiBaseUrl}/reports`,
          `${environment.apiBaseUrl}/reports/*`,
          `${environment.apiBaseUrl}/account/*`,
          {
            uri: `${environment.apiBaseUrl}/gallery/*`,
            httpMethod: 'POST',
          },
          {
            uri: `${environment.apiBaseUrl}/gallery/*`,
            httpMethod: 'PUT',
          },
          {
            uri: `${environment.apiBaseUrl}/gallery/*`,
            httpMethod: 'DELETE',
          },
        ],
      },
    }),
  ],
};
