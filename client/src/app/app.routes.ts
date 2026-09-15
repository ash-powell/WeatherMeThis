import { Routes } from '@angular/router';

import { GalleryPage } from './gallery/ui/gallery-page/gallery-page';

import { PublicReportPage } from './gallery/ui/public-report-page/public-report-page';

export const routes: Routes = [
  {
    path: 'gallery',
    component: GalleryPage,
  },
  {
    path: 'gallery/:reportId',
    component: PublicReportPage,
  },
];
