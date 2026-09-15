import {
  MEASUREMENTS,
  measurementNames,
  measurementOptions,
} from '../../../weather/models/measurement.models';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { DatePipe } from '@angular/common';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '@auth0/auth0-angular';

import { distinctUntilChanged } from 'rxjs';

import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { GalleryFacade } from '../../application/gallery-facade';

import type {
  GalleryReportSummary,
  GallerySearchQuery,
  GallerySort,
} from '../../models/gallery.models';

import type { Measurement } from '../../../weather/models/analysis.models';

@Component({
  selector: 'app-gallery-page',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './gallery-page.html',
  styleUrl: './gallery-page.scss',
})
export class GalleryPage implements OnInit {
  private readonly galleryFacade = inject(GalleryFacade);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly response = this.galleryFacade.searchResponse;
  readonly authenticated = toSignal(this.auth.isAuthenticated$, {
    initialValue: false,
  });

  readonly loading = signal(false);
  readonly message = signal('');
  readonly likingReportId = signal<string | null>(null);

  name = '';
  city = '';
  readonly measurementOptions = measurementOptions;
  measurement: Measurement | '' = '';
  sort: GallerySort = 'newest';
  readonly pageSize = 12;

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;

    this.name = query.get('name') ?? '';
    this.city = query.get('city') ?? '';
    this.measurement = this.readMeasurement(query.get('measurement'));
    this.sort = this.readSort(query.get('sort'));

    this.search(Number(query.get('page')) || 1, false);

    this.auth.isAuthenticated$
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((authenticated) => {
        if (authenticated) {
          this.loadLikedStatuses();
        }
      });
  }

  applyFilters(): void {
    this.search(1);
  }

  clearFilters(): void {
    this.name = '';
    this.city = '';
    this.measurement = '';
    this.sort = 'newest';
    this.search(1);
  }

  goToPage(page: number): void {
    const response = this.response();

    if (!response || page < 1 || page > response.totalPages || page === response.page) {
      return;
    }

    this.search(page);
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  toggleLike(report: GalleryReportSummary): void {
    if (!this.authenticated()) {
      this.login();
      return;
    }

    this.likingReportId.set(report._id);

    this.galleryFacade.setLiked(report._id, !report.likedByCurrentUser).subscribe({
      next: () => {
        this.likingReportId.set(null);
        this.message.set('');
      },
      error: (error) => {
        console.error('Unable to update like:', error);
        this.likingReportId.set(null);
        this.message.set('Unable to update this story like.');
      },
    });
  }

  measurementLabel(measurement: Measurement): string {
    return MEASUREMENTS[measurement].label;
  }

  private search(page: number, updateUrl = true): void {
    const request: GallerySearchQuery = {
      name: this.name,
      city: this.city,
      measurement: this.measurement,
      sort: this.sort,
      page,
      pageSize: this.pageSize,
    };

    if (updateUrl) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          name: this.name.trim() || null,
          city: this.city.trim() || null,
          measurement: this.measurement || null,
          sort: this.sort === 'newest' ? null : this.sort,
          page: page === 1 ? null : page,
        },
      });
    }

    this.loading.set(true);
    this.message.set('');

    this.galleryFacade.search(request).subscribe({
      next: () => {
        this.loading.set(false);
        this.loadLikedStatuses();
      },
      error: (error) => {
        console.error('Gallery search failed:', error);
        this.loading.set(false);
        this.message.set('Unable to load the public story gallery.');
      },
    });
  }

  private loadLikedStatuses(): void {
    if (!this.authenticated()) {
      return;
    }

    const reportIds = this.response()?.reports.map((report) => report._id) ?? [];

    this.galleryFacade.loadLikedStatuses(reportIds).subscribe({
      error: (error) => {
        console.error('Unable to retrieve liked reports:', error);
      },
    });
  }

  private login(): void {
    this.auth
      .loginWithRedirect({
        appState: {
          target: this.router.url,
        },
      })
      .subscribe({
        error: (error) => {
          console.error('Login redirect failed:', error);
          this.message.set('Unable to begin login.');
        },
      });
  }

  private readMeasurement(value: string | null): Measurement | '' {
    return value && measurementNames.includes(value as Measurement) ? (value as Measurement) : '';
  }

  private readSort(value: string | null): GallerySort {
    return value === 'oldest' || value === 'popular' ? value : 'newest';
  }
}
