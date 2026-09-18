import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthService } from '@auth0/auth0-angular';

import { ReportDraftStorage } from './reports/data-access/report-draft-storage';

import { ReportFacade } from './reports/application/report-facade';

import type { SeriesInput } from './reports/models/report-editor.models';

import type { AnalysisRequest, GroupBy } from './weather/models/analysis.models';
import type { ChartType } from './weather/models/chart.models';

import type { ReportRequest, SavedReport } from './reports/models/report.models';

import { buildAnalysisRequest as buildAnalysisRequestResult } from './reports/domain/analysis-request.builder';

import { buildReportRequest as buildReportRequestResult } from './reports/domain/report-request.builder';

import { SavedReportList } from './reports/ui/saved-report-list/saved-report-list';
import { ReportEditor } from './reports/ui/report-editor/report-editor';
import { AccountMenu } from './account/ui/account-menu/account-menu';
import { GalleryFacade } from './gallery/application/gallery-facade';
import { DialogService } from './shared/application/dialog.service';
import { MessageDialog } from './shared/ui/message-dialog/message-dialog';

@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    AsyncPipe,
    SavedReportList,
    ReportEditor,
    AccountMenu,
    RouterLink,
    RouterOutlet,
    MessageDialog,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected auth = inject(AuthService);

  // inject services
  private readonly reportDraftStorage = inject(ReportDraftStorage);
  private readonly reportFacade = inject(ReportFacade);
  private readonly galleryFacade = inject(GalleryFacade);
  private readonly router = inject(Router);
  private readonly dialogs = inject(DialogService);

  statusMessage = '';

  private nextWeatherModalRequest = 0;
  private latestWeatherModalRequest = 0;

  showMessage(message: string): void {
    if (message) {
      this.dialogs.show(message, 'WeatherMeThis');
    }
  }

  autopopulate = false;

  readonly report = this.reportFacade.report;
  readonly savedReports = this.reportFacade.savedReports;
  readonly reportId = this.reportFacade.reportId;
  readonly selectedReportIsPublic = this.reportFacade.selectedReportIsPublic;
  readonly loadedStoryName = this.reportFacade.loadedStoryName;
  readonly savedStoriesOpen = signal(false);
  readonly savedStoriesLoading = signal(false);
  readonly tutorialLoading = signal(false);

  private readonly tutorialReportId = '6aa5daa864d7278aa1abb785';

  hasDisplayedChart(): boolean {
    return this.report().charts.some((chart) => chart.graphSeries.length > 0);
  }

  readonly galleryActive = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.startsWith('/gallery')),
    ),
    {
      initialValue: this.router.url.startsWith('/gallery'),
    },
  );

  closeSavedReports(): void {
    this.savedStoriesOpen.set(false);
    this.reportFacade.closeSavedReports();
  }

  @ViewChild('storyMenu') private storyMenu?: ElementRef<HTMLDetailsElement>;

  @HostListener('document:click', ['$event'])
  closeStoryMenuOutside(event: Event): void {
    const menu = this.storyMenu?.nativeElement;
    if (menu && event.target instanceof Node && !menu.contains(event.target)) {
      menu.open = false;
    }
  }

  setReportName(name: string): void {
    this.reportFacade.setReportName(name);
  }

  //////////////////////////// Auth0 login and helper methods ///////////////////
  // Auth0 redirect will refresh page so save inputs to session storage first

  ngOnInit(): void {
    this.restoreReportDraft();
  }

  login(): void {
    this.beginAuthRedirect('login');
  }

  signUp(): void {
    this.beginAuthRedirect('signup');
  }

  private beginAuthRedirect(operation: 'login' | 'signup'): void {
    const reportWasSaved = this.saveReportDraft();
    if (!reportWasSaved) {
      return;
    }

    this.auth
      .loginWithRedirect({
        appState: {
          target: window.location.pathname + window.location.search,
        },

        authorizationParams:
          operation === 'signup'
            ? {
                screen_hint: 'signup',
              }
            : undefined,
      })
      .subscribe({
        error: (error) => {
          console.error(`${operation} redirect failed:`, error);

          // The redirect did not occur, so the current
          // in-memory chart is still available.
          this.reportDraftStorage.clear();

          this.showMessage(
            operation === 'signup' ? 'Unable to begin sign-up.' : 'Unable to begin login.',
          );
        },
      });
  }

  private saveReportDraft(): boolean {
    try {
      this.reportDraftStorage.save(
        this.report(),
        this.reportId(),
        this.loadedStoryName(),
        this.autopopulate,
      );

      return true;
    } catch (error) {
      console.error('Unable to preserve report before authentication:', error);

      this.showMessage('Your story could not be preserved, so authentication was not opened.');

      return false;
    }
  }

  private restoreReportDraft(): void {
    try {
      const draft = this.reportDraftStorage.load();

      if (!draft) {
        return;
      }

      this.reportFacade.restoreDraft(draft.report, draft.reportId, draft.loadedStoryName);

      this.autopopulate = draft.autopopulate;

      this.reportDraftStorage.clear();
    } catch (error) {
      console.error('Unable to restore report draft:', error);

      this.reportDraftStorage.clear();

      this.showMessage('The story saved before login could not be restored.');
    }
  }

  openSavedReports(): void {
    this.savedStoriesOpen.set(true);
    this.savedStoriesLoading.set(true);

    this.reportFacade.loadSavedReports().subscribe({
      next: () => {
        this.savedStoriesLoading.set(false);
      },

      error: (error) => {
        this.savedStoriesLoading.set(false);
        this.savedStoriesOpen.set(false);
        console.error('Report retrieval failed:', error);

        if (error.status === 401) {
          this.showMessage('Please log in to view saved stories');
        } else {
          this.showMessage('Unable to retrieve saved stories');
        }
      },
    });
  }

  openTutorial(): void {
    if (this.tutorialLoading()) {
      return;
    }

    this.tutorialLoading.set(true);
    this.dialogs.showLoading('Loading tutorial...', 'Tutorial');

    this.galleryFacade.loadReport(this.tutorialReportId).subscribe({
      next: ({ report, charts }) => {
        this.reportFacade.openReportCopy(report, charts);
        this.tutorialLoading.set(false);
        this.dialogs.close();
        void this.router.navigateByUrl('/');
      },
      error: (error: HttpErrorResponse) => {
        this.tutorialLoading.set(false);
        console.error('Tutorial retrieval failed:', error);

        this.dialogs.show(
          error.status === 404
            ? 'The tutorial story is not currently available.'
            : 'Unable to load the tutorial story. Please try again.',
          'Tutorial',
        );
      },
    });
  }

  toggleSelectedReportPublication(): void {
    const reportId = this.reportId();

    if (!reportId) {
      this.showMessage('Save or select a story before making it public');
      return;
    }

    if (this.selectedReportIsPublic()) {
      this.unpublishReportById(reportId);
    } else {
      this.publishReportById(reportId);
    }
  }

  async copySelectedReportLink(): Promise<void> {
    const reportId = this.reportId();

    if (!reportId || !this.selectedReportIsPublic()) {
      this.showMessage('Make this story public before sharing its link');
      return;
    }

    const publicUrl = new URL(`/gallery/${reportId}`, window.location.origin).href;

    try {
      await navigator.clipboard.writeText(publicUrl);
      this.statusMessage = 'Public story link copied to your clipboard.';
    } catch (error) {
      console.error('Unable to copy public report link:', error);
      this.statusMessage = '';
      this.showMessage('Unable to copy the public story link');
    }
  }

  private publishReportById(reportId: string): void {
    this.galleryFacade.publish(reportId).subscribe({
      next: () => {
        this.statusMessage = 'Story added to the public gallery.';
        if (this.reportId() === reportId) {
          this.reportFacade.setSelectedReportPublication(true);
        }
      },
      error: (error) => {
        console.error('Report publication failed:', error);
        this.statusMessage = '';
        this.showMessage(
          error.status === 401
            ? 'Please log in before publishing a story'
            : 'Unable to publish the story',
        );
      },
    });
  }

  private unpublishReportById(reportId: string): void {
    this.galleryFacade.unpublish(reportId).subscribe({
      next: () => {
        this.statusMessage = 'Story removed from the public gallery.';
        if (this.reportId() === reportId) {
          this.reportFacade.setSelectedReportPublication(false);
        }
      },
      error: (error) => {
        console.error('Report unpublishing failed:', error);
        this.statusMessage = '';
        this.showMessage(
          error.status === 401
            ? 'Please log in before unpublishing a story'
            : 'Unable to unpublish the story',
        );
      },
    });
  }

  ////////////////////////////////////////////////////////////////////////////////

  // find coordinates for input location
  searchCity(chartId: number, series: SeriesInput): void {
    const searchText = series.locationSearch.trim();

    if (!searchText) {
      this.showMessage('Please enter a city or airport');

      return;
    }

    this.reportFacade.searchLocations(chartId, series.seriesId, searchText).subscribe({
      next: (data) => {
        if (!data.results?.length) {
          this.showMessage('No matching locations found.');
        }
      },

      error: (error) => {
        console.error('Location search failed:', error);

        this.showMessage('Unable to search for locations.');
      },
    });
  }

  getWeatherData(chartId: number, requestedChartType?: ChartType): void {
    const modalRequestId = ++this.nextWeatherModalRequest;
    this.latestWeatherModalRequest = modalRequestId;
    this.dialogs.showLoading('Retrieving data...', 'Weather data');

    const chart = this.report().charts.find((candidate) => candidate.chartId === chartId);

    if (!chart) {
      this.showMessage('Chart not found');
      return;
    }

    const requests = [];

    for (const series of chart.seriesInputs) {
      const analysis = this.buildAnalysisRequest(series, chart.groupBy, chart.metricUnits);

      if (!analysis) {
        return;
      }

      requests.push({ seriesId: series.seriesId, analysis });
    }

    this.reportFacade
      .loadChartWeatherData(chartId, requests, requestedChartType ?? chart.chartType)
      .subscribe({
        next: (chartWasBuilt) => {
          if (this.latestWeatherModalRequest !== modalRequestId) {
            return;
          }

          if (chartWasBuilt) {
            this.dialogs.showTemporary('Chart is ready!', 'Weather data', 1000);
          } else {
            this.dialogs.close();
          }
        },

        error: (error) => {
          console.error('Weather request failed:', error);

          if (this.latestWeatherModalRequest !== modalRequestId) {
            return;
          }

          this.dialogs.show(this.weatherRequestErrorMessage(error), 'Weather data');
        },
      });
  }

  private weatherRequestErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const responseBody: unknown = error.error;

      if (
        typeof responseBody === 'object' &&
        responseBody !== null &&
        'error' in responseBody &&
        typeof responseBody.error === 'string'
      ) {
        return responseBody.error;
      }
    }

    return 'Unable to retrieve weather data.';
  }

  ////////////////////  Persistent storage methods ///////////////////////////////

  async saveReport(): Promise<void> {
    const reportRequest = this.buildReportRequest();

    if (!reportRequest) {
      return;
    }

    const loadedStoryName = this.loadedStoryName();

    if (this.reportId() && loadedStoryName) {
      const requestedName = reportRequest.name.trim().toLocaleLowerCase();
      const loadedName = loadedStoryName.trim().toLocaleLowerCase();

      if (requestedName === loadedName) {
        this.dialogs.show(
          'Cannot save a new story with the same name. ' +
            'Click "Save Changes" to save changes to current story ' +
            'or change the name before saving a new story.',
          'Story already loaded',
        );
        return;
      }

      const shouldContinue = await this.dialogs.confirm({
        title: 'Save a new story?',
        message:
          'A new story will be saved with the new name, and the ' +
          'currently loaded story will remain. Cancel and choose ' +
          '"Save Changes" to make changes to the current story ' +
          'without creating an additional story',
        confirmLabel: 'Continue',
        cancelLabel: 'Cancel',
      });

      if (!shouldContinue) {
        return;
      }
    }

    this.reportFacade.saveReport(reportRequest).subscribe({
      error: (error) => {
        console.error('Save report failed:', error);

        if (error.status === 409) {
          this.showMessage(
            'You already have a saved story with this name. Choose a different name, or open that story and use Save Changes.',
          );
        } else if (error.status === 401) {
          this.showMessage('Must be signed in before saving a story');
        } else if (error.status === 400) {
          this.showMessage('The story contains invalid data');
        } else {
          this.showMessage('Unable to save the story');
        }
      },
    });
  }

  selectReport(saved: SavedReport): void {
    this.savedStoriesOpen.set(false);
    const charts = this.reportFacade.selectReport(saved);

    for (const chart of charts) {
      this.getWeatherData(chart.chartId);
    }
  }

  updateReport(): void {
    if (!this.reportId()) {
      this.showMessage('No saved story is selected');

      return;
    }

    const request = this.buildReportRequest();

    if (!request) {
      return;
    }

    this.reportFacade.updateSelectedReport(request).subscribe({
      error: (error) => {
        console.error('Report update failed:', error);

        if (error.status === 409) {
          this.showMessage(
            'You already have a saved story with this name. Choose a different name, or open that story and use Save Changes.',
          );
        } else if (error.status === 401) {
          this.showMessage('Please log in before updating a story');
        } else if (error.status === 404) {
          this.showMessage('The selected story was not found');
        } else {
          this.showMessage('Unable to update the story');
        }
      },
    });
  }

  async deleteReport(): Promise<void> {
    if (!this.reportId()) {
      this.showMessage('No saved story is selected');

      return;
    }

    const storyName = this.loadedStoryName()?.trim() || 'the selected story';

    const shouldDelete = await this.dialogs.confirm({
      title: 'Delete story?',
      message:
        `Are you sure you want to permanently delete this story: ${storyName}? ` +
        '\nThis cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      confirmDanger: true,
    });

    if (!shouldDelete) {
      return;
    }

    this.reportFacade.deleteSelectedReport().subscribe({
      error: (error) => {
        console.error('Report deletion failed:', error);

        if (error.status === 401) {
          this.showMessage('Please log in before deleting a story');
        } else if (error.status === 404) {
          this.showMessage('The selected story was not found');
        } else {
          this.showMessage('Unable to delete the story');
        }
      },
    });
  }

  ////////////////////////////////////////////////////////////////////////////////

  // build analysis
  buildAnalysisRequest(
    series: SeriesInput,
    groupBy: GroupBy | null,
    metricUnits = false,
  ): AnalysisRequest | null {
    const result = buildAnalysisRequestResult(series, groupBy, metricUnits);

    if (!result.ok) {
      this.showMessage(result.error);
      return null;
    }

    return result.value;
  }

  buildReportRequest(): ReportRequest | null {
    const result = buildReportRequestResult(this.report());

    if (!result.ok) {
      this.showMessage(result.error);
      return null;
    }

    return result.value;
  }
}
