import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { of } from 'rxjs';

import { App } from './app';
import { ReportEditorStore } from './reports/state/report-editor-store';
import { DialogService } from './shared/application/dialog.service';

describe('App', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isLoading$: of(false),
            isAuthenticated$: of(false),
            user$: of(null),
            error$: of(null),
            loginWithRedirect: () => of(undefined),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should show the gallery destination in the editor', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Public Gallery');
    expect(compiled.textContent).not.toContain('Story Editor');
  });

  it('shows the currently enabled Help menu items in order', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const menuItems = Array.from(
      fixture.nativeElement.querySelectorAll('.help-menu-actions button'),
      (button: Element) => button.textContent?.trim(),
    );

    expect(menuItems).toEqual(['Instructions', 'FAQ']);
  });

  it('opens searchable help documents and keeps a close button outside the scrolling content', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    fixture.detectChanges();
    app.openHelpDocument('instructions');
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.help-document-dialog') as HTMLElement;
    const search = dialog.querySelector('input[type="search"]') as HTMLInputElement;

    expect(dialog.textContent).toContain('Build your first chart');
    expect(dialog.querySelector('.help-document-heading .help-document-close')).toBeTruthy();
    expect(dialog.querySelector('.help-document-content .help-document-close')).toBeNull();

    search.value = 'rate limit';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(dialog.textContent).toContain('If a request fails');
    expect(dialog.textContent).not.toContain('Build your first chart');

    app.closeHelpDocument();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.help-document-dialog')).toBeNull();
  });

  it('opens saved stories in a modal and displays the retrieved stories', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    app.openSavedReports();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Loading saved stories...');

    const request = http.expectOne((candidate) => candidate.url.endsWith('/reports'));
    request.flush([
      {
        _id: 'saved-story-1',
        name: 'Raleigh Weather',
        charts: [],
        createdAt: '2026-09-17T12:00:00.000Z',
        isPublic: false,
        publishedAt: null,
        likeCount: 0,
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Raleigh Weather');
    http.verify();
  });

  it('shows Get Data progress and confirms that the chart was built', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const store = TestBed.inject(ReportEditorStore);
    const dialogs = TestBed.inject(DialogService);
    const http = TestBed.inject(HttpTestingController);
    const chart = prepareWeatherChart(store);

    fixture.detectChanges();
    const retrieval = app.getWeatherData(chart.chartId, chart.seriesInputs[0].seriesId);

    const planRequest = http.expectOne((candidate) => candidate.url.endsWith('/weather/plan'));
    planRequest.flush({
      cacheMisses: 1,
      estimatedOpenMeteoCalls: 1,
      requiresConfirmation: false,
    });
    await retrieval;
    fixture.detectChanges();

    expect(dialogs.dialog()?.message).toBe('Retrieving data...');
    expect(dialogs.dialog()?.confirmLabel).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Retrieving data...');

    const request = http.expectOne((candidate) => candidate.url.endsWith('/weather'));
    request.flush([{ date: 'all', value: 72 }]);

    expect(dialogs.dialog()?.message).toBe('Chart is ready!');
    expect(dialogs.dialog()?.autoCloseMs).toBe(1000);
    expect(store.report().charts[0].graphSeries).toHaveLength(1);
    http.verify();
    dialogs.close();
  });

  it('automatically closes a temporary success modal after one second', () => {
    vi.useFakeTimers();
    const dialogs = new DialogService();

    dialogs.showTemporary('Chart is ready!', 'Weather data', 1000);

    vi.advanceTimersByTime(999);
    expect(dialogs.dialog()?.message).toBe('Chart is ready!');
    vi.advanceTimersByTime(1);
    expect(dialogs.dialog()).toBeNull();
  });

  it('shows the provider-specific message returned for an Open-Meteo failure', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const store = TestBed.inject(ReportEditorStore);
    const dialogs = TestBed.inject(DialogService);
    const http = TestBed.inject(HttpTestingController);
    const chart = prepareWeatherChart(store);

    fixture.detectChanges();
    const retrieval = app.getWeatherData(chart.chartId, chart.seriesInputs[0].seriesId);
    http
      .expectOne((candidate) => candidate.url.endsWith('/weather/plan'))
      .flush({
        cacheMisses: 1,
        estimatedOpenMeteoCalls: 1,
        requiresConfirmation: false,
      });
    await retrieval;

    const request = http.expectOne((candidate) => candidate.url.endsWith('/weather'));
    request.flush(
      {
        error: 'Unable to connect to Open-Meteo. Please try again shortly.',
      },
      {
        status: 502,
        statusText: 'Bad Gateway',
      },
    );

    expect(dialogs.dialog()?.message).toBe(
      'Unable to connect to Open-Meteo. Please try again shortly.',
    );
    expect(dialogs.dialog()?.confirmLabel).toBe('Close');
    http.verify();
  });

  it('loads stored chart points without contacting the weather API', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const store = TestBed.inject(ReportEditorStore);
    const http = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    app.selectReport({
      _id: 'saved-story-1',
      name: 'Cached Raleigh weather',
      createdAt: '2026-09-24T00:00:00.000Z',
      isPublic: false,
      publishedAt: null,
      likeCount: 0,
    });

    http
      .expectOne((candidate) => candidate.url.endsWith('/reports/saved-story-1'))
      .flush({
        _id: 'saved-story-1',
        name: 'Cached Raleigh weather',
        createdAt: '2026-09-24T00:00:00.000Z',
        isPublic: false,
        publishedAt: null,
        likeCount: 0,
        charts: [
          {
            name: 'Rain',
            comments: '',
            chartType: 'line',
            metricUnits: false,
            groupBy: 'year',
            seriesArray: [
              {
                title: 'Rainfall',
                location: {
                  city: 'Raleigh',
                  admin1: 'North Carolina',
                  country: 'United States',
                  latitude: 35.7796,
                  longitude: -78.6382,
                },
                startDate: '2020-01-01',
                endDate: '2025-12-31',
                dateFilter: { unit: 'none', min: '', max: '' },
                measurement: 'rain_sum',
                comparison: 'none',
                threshold: null,
                aggregation: 'sum',
                avgFrequency: 'none',
                movingAverageWindow: null,
              },
            ],
            renderedSeries: [
              {
                label: 'Rainfall',
                yAxisId: 'rain_sum',
                yAxisLabel: 'Rain (inch)',
                requestKey: 'stored-key',
                dates: ['2024', '2025'],
                values: [48.1, 39.4],
              },
            ],
          },
        ],
      });

    expect(store.report().charts[0].graphSeries[0].points).toEqual([
      { date: '2024', value: 48.1 },
      { date: '2025', value: 39.4 },
    ]);
    http.expectNone((candidate) => candidate.url.includes('/weather'));
    http.verify();
  });

  it('retrieves only the selected new series and preserves existing chart points', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const store = TestBed.inject(ReportEditorStore);
    const http = TestBed.inject(HttpTestingController);
    const chart = prepareWeatherChart(store);
    const firstSeriesId = chart.seriesInputs[0].seriesId;

    fixture.detectChanges();

    const firstRetrieval = app.getWeatherData(chart.chartId, firstSeriesId);
    http
      .expectOne((candidate) => candidate.url.endsWith('/weather/plan'))
      .flush({
        cacheMisses: 1,
        estimatedOpenMeteoCalls: 1,
        requiresConfirmation: false,
      });
    await firstRetrieval;
    http
      .expectOne((candidate) => candidate.url.endsWith('/weather'))
      .flush([{ date: 'all', value: 72 }]);

    store.addSeries(chart.chartId, firstSeriesId, true);
    const secondSeriesId = store.report().charts[0].seriesInputs[1].seriesId;

    const secondRetrieval = app.getWeatherData(chart.chartId, secondSeriesId);
    const secondPlan = http.expectOne((candidate) => candidate.url.endsWith('/weather/plan'));
    expect(secondPlan.request.body.analyses).toHaveLength(1);
    secondPlan.flush({
      cacheMisses: 0,
      estimatedOpenMeteoCalls: 0,
      requiresConfirmation: false,
    });
    await secondRetrieval;
    http
      .expectOne((candidate) => candidate.url.endsWith('/weather'))
      .flush([{ date: 'all', value: 68 }]);

    const graphSeries = store.report().charts[0].graphSeries;
    expect(graphSeries).toHaveLength(2);
    expect(graphSeries.find((series) => series.seriesId === firstSeriesId)?.points).toEqual([
      { date: 'all', value: 72 },
    ]);
    expect(graphSeries.find((series) => series.seriesId === secondSeriesId)?.points).toEqual([
      { date: 'all', value: 68 },
    ]);
    http.verify();
  });

  it('asks before a stale refresh whose uncached cost exceeds 600 weighted calls', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const store = TestBed.inject(ReportEditorStore);
    const dialogs = TestBed.inject(DialogService);
    const http = TestBed.inject(HttpTestingController);
    const chart = prepareWeatherChart(store);
    const seriesId = chart.seriesInputs[0].seriesId;

    fixture.detectChanges();
    const retrieval = app.getWeatherData(chart.chartId, seriesId);
    http
      .expectOne((candidate) => candidate.url.endsWith('/weather/plan'))
      .flush({
        cacheMisses: 12,
        estimatedOpenMeteoCalls: 625.4,
        requiresConfirmation: true,
      });
    await Promise.resolve();

    expect(dialogs.dialog()?.title).toBe('Large weather data retrieval');
    expect(dialogs.dialog()?.message).toContain('625.4 weighted API calls');
    http.expectNone((candidate) => candidate.url.endsWith('/weather'));

    dialogs.respond(false);
    await retrieval;
    http.verify();
  });
});

function prepareWeatherChart(store: ReportEditorStore) {
  const chart = store.report().charts[0];

  store.updateChart(chart.chartId, (current) => ({
    ...current,
    groupBy: 'all',
  }));
  store.updateSeries(chart.chartId, chart.seriesInputs[0].seriesId, (series) => ({
    ...series,
    city: 'Raleigh',
    country: 'United States',
    latitude: 35.7796,
    longitude: -78.6382,
    measurement: 'temperature_2m_max',
    aggregation: 'max',
    avgFrequency: 'none',
    comparison: 'none',
    threshold: null,
  }));

  return store.report().charts[0];
}
