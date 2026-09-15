import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';

import { DatePipe } from '@angular/common';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '@auth0/auth0-angular';

import { distinctUntilChanged } from 'rxjs';

import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { GalleryFacade } from '../../application/gallery-facade';

import { ReportCharts } from '../../../reports/ui/report-charts/report-charts';

import { ReportFacade } from '../../../reports/application/report-facade';

import type { ChartInput } from '../../../reports/models/report-editor.models';

@Component({
  selector: 'app-public-report-page',
  imports: [DatePipe, RouterLink, ReportCharts],
  templateUrl: './public-report-page.html',
  styleUrl: './public-report-page.scss',
})
export class PublicReportPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly galleryFacade = inject(GalleryFacade);
  private readonly reportFacade = inject(ReportFacade);
  private readonly destroyRef = inject(DestroyRef);

  readonly report = this.galleryFacade.currentReport;
  readonly authenticated = toSignal(this.auth.isAuthenticated$, {
    initialValue: false,
  });

  readonly charts = signal<ChartInput[]>([]);
  readonly loading = signal(true);
  readonly liking = signal(false);
  readonly message = signal('');

  private reportId = '';

  ngOnInit(): void {
    this.reportId = this.route.snapshot.paramMap.get('reportId') ?? '';

    if (!this.reportId) {
      this.loading.set(false);
      this.message.set('Public story not found.');
      return;
    }

    this.galleryFacade.loadReport(this.reportId).subscribe({
      next: (view) => {
        this.charts.set(view.charts);
        this.loading.set(false);
        this.loadLikedStatus();
      },
      error: (error) => {
        console.error('Public report retrieval failed:', error);
        this.loading.set(false);
        this.message.set(
          error.status === 404
            ? 'This story is not public or no longer exists.'
            : 'Unable to load this public story.',
        );
      },
    });

    this.auth.isAuthenticated$
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((authenticated) => {
        if (authenticated) {
          this.loadLikedStatus();
        }
      });
  }

  toggleLike(): void {
    const report = this.report();

    if (!report) {
      return;
    }

    if (!this.authenticated()) {
      this.login();
      return;
    }

    this.liking.set(true);

    this.galleryFacade.setLiked(report._id, !report.likedByCurrentUser).subscribe({
      next: () => {
        this.liking.set(false);
        this.message.set('');
      },
      error: (error) => {
        console.error('Unable to update like:', error);
        this.liking.set(false);
        this.message.set('Unable to update this story like.');
      },
    });
  }

  async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.message.set('Link copied to your clipboard.');
    } catch (error) {
      console.error('Unable to copy story link:', error);
      this.message.set('Unable to copy the link. Copy it from your browser address bar.');
    }
  }

  openInEditor(): void {
    const report = this.report();

    if (!report) {
      return;
    }

    this.reportFacade.openReportCopy(report, this.charts());

    void this.router.navigateByUrl('/');
  }

  private loadLikedStatus(): void {
    if (!this.authenticated() || !this.reportId) {
      return;
    }

    this.galleryFacade.loadLikedStatuses([this.reportId]).subscribe({
      error: (error) => {
        console.error('Unable to retrieve liked report status:', error);
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
}
