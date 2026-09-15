import {
  Component,
  computed,
  HostListener,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { AuthService } from '@auth0/auth0-angular';

import { AccountFacade } from '../../application/account-facade';

@Component({
  selector: 'app-account-menu',
  imports: [FormsModule],
  templateUrl: './account-menu.html',
  styleUrl: './account-menu.scss',
})
export class AccountMenu implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly accountFacade = inject(AccountFacade);

  readonly email = input('');
  readonly authName = input('');
  readonly message = output<string>();

  readonly profile = this.accountFacade.profile;
  readonly menuOpen = signal(false);
  readonly editDialogOpen = signal(false);
  readonly deleteDialogOpen = signal(false);
  readonly busy = signal(false);

  displayNameDraft = '';
  deleteConfirmation = '';

  readonly displayName = computed(
    () =>
      this.profile()?.displayName?.trim() ||
      this.authName().trim() ||
      this.email().trim() ||
      'Account',
  );

  readonly initials = computed(() => {
    const parts = this.displayName().split(/\s+/).filter(Boolean);

    return (
      parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || '?'
    );
  });

  ngOnInit(): void {
    this.accountFacade.loadProfile().subscribe({
      error: (error) => {
        console.error('Account profile retrieval failed:', error);

        this.message.emit('Unable to retrieve your account profile.');
      },
    });
  }

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen.update((open) => !open);
  }

  @HostListener('document:click')
  closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  closeOverlays(): void {
    this.menuOpen.set(false);
    this.editDialogOpen.set(false);
    this.deleteDialogOpen.set(false);
  }

  openEditDialog(event: MouseEvent): void {
    event.stopPropagation();
    this.displayNameDraft = this.displayName();
    this.menuOpen.set(false);
    this.editDialogOpen.set(true);
  }

  closeEditDialog(): void {
    if (!this.busy()) {
      this.editDialogOpen.set(false);
    }
  }

  saveDisplayName(): void {
    const displayName = this.displayNameDraft.trim();

    if (!displayName) {
      this.message.emit('Please enter a display name.');
      return;
    }

    if (displayName.length > 100) {
      this.message.emit('Display name must be 100 characters or fewer.');
      return;
    }

    this.busy.set(true);

    this.accountFacade.updateDisplayName(displayName).subscribe({
      next: () => {
        this.busy.set(false);
        this.editDialogOpen.set(false);
        this.message.emit('');
      },

      error: (error) => {
        console.error('Account profile update failed:', error);

        this.busy.set(false);
        this.message.emit('Unable to update your display name.');
      },
    });
  }

  logout(): void {
    this.auth
      .logout({
        logoutParams: {
          returnTo: window.location.origin,
        },
      })
      .subscribe({
        error: (error) => {
          console.error('Logout failed:', error);
          this.message.emit('Unable to log out.');
        },
      });
  }

  openDeleteDialog(event: MouseEvent): void {
    event.stopPropagation();
    this.deleteConfirmation = '';
    this.menuOpen.set(false);
    this.deleteDialogOpen.set(true);
  }

  closeDeleteDialog(): void {
    if (!this.busy()) {
      this.deleteDialogOpen.set(false);
    }
  }

  deleteMembership(): void {
    if (this.deleteConfirmation !== 'DELETE') {
      this.message.emit('Type DELETE exactly to confirm membership deletion.');
      return;
    }

    this.busy.set(true);

    this.accountFacade.deleteMembership().subscribe({
      next: () => {
        this.busy.set(false);
        this.logout();
      },

      error: (error) => {
        console.error('Membership deletion failed:', error);

        this.busy.set(false);
        this.message.emit(
          'Unable to delete your membership. Your Auth0 account may still be active.',
        );
      },
    });
  }
}
