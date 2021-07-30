import { Component, OnInit, Input, HostListener, SimpleChanges } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { WalletService } from '../../services/wallet/wallet.service';
import { Account, TorusWallet } from '../../services/wallet/wallet';
import { LookupService } from '../../services/lookup/lookup.service';
import { MessageService } from '../../services/message/message.service';
import { CONSTANTS as _CONSTANTS } from '../../../environments/environment';
import { filter } from 'rxjs/operators';
import copy from 'copy-to-clipboard';
import { TranslateService } from '@ngx-translate/core';
import { ModalComponent } from '../modal/modal.component';
import { DelegateService } from '../../services/delegate/delegate.service';
import { SubjectService } from '../../services/subject/subject.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['../../../scss/components/header/header.component.scss']
})
export class HeaderComponent implements OnInit {
  window = window;
  document = document;
  @Input() activeAccount: Account;
  accounts: Account[];
  delegateName = '';
  readonly CONSTANTS = _CONSTANTS;
  constructor(
    public router: Router,
    public walletService: WalletService,
    public lookupService: LookupService,
    private messageService: MessageService,
    private translate: TranslateService,
    private delegateService: DelegateService,
    private subjectService: SubjectService
  ) { }

  ngOnInit(): void {
    this.walletService.walletUpdated.subscribe(async () => {
      this.accounts = this.walletService.wallet?.getAccounts();
      this.delegateName = await this.getDelegateName(this.activeAccount?.delegate);
    });
    this.accounts = this.walletService.wallet?.getAccounts();

    this.router.events
      .pipe(filter((evt) => evt instanceof NavigationEnd))
      .subscribe(async (r: NavigationEnd) => {

        if (!(this.accounts?.length > 0) && r.url.indexOf('/account/') === 0) {
          this.router.navigateByUrl('/');
        } else if ((this.accounts?.length > 0 && r.url.indexOf('/account') === 0) || (this.accounts?.length > 0 && r.url.indexOf('/account') !== 0)) {
          let accountAddress = r.url.substr(r.url.indexOf('/account/') + 9);
          accountAddress = accountAddress.indexOf('/') !== -1 ? accountAddress.substring(0, accountAddress.indexOf('/')) : accountAddress;
          if (!this.walletService.addressExists(accountAddress)) {
            this.router.navigateByUrl(`/account/${this.accounts[0].address}`);
            this.activeAccount = this.accounts[0];
            this.walletService.activeAccount.next(this.accounts[0]);
          } else {
            this.activeAccount = this.walletService.wallet?.getAccount(accountAddress);
            this.walletService.activeAccount.next(this.activeAccount);
          }
          this.delegateName = await this.getDelegateName(this.activeAccount?.delegate);
        }
      });
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes?.activeAccount?.currentValue) {
      this.delegateName = await this.getDelegateName(changes?.activeAccount?.currentValue.delegate);
    }
  }

  logout() {
    this.subjectService.logout.next(true);
    this.messageService.clear();
    this.walletService.clearWallet();
    this.lookupService.clear();
    this.router.navigate(['']);
  }
  getUsername() {
    if (this.walletService.wallet instanceof TorusWallet) {
      return this.walletService.wallet.displayName();
    } else if (this.activeAccount) {
      const party = this.lookupService.resolve({ address: this.activeAccount.address });
      if (party?.name) {
        return party.name;
      }
    }
    return '';
  }
  getVerifier() {
    if (this.walletService.wallet instanceof TorusWallet) {
      return this.walletService.wallet.verifier;
    } else {
      return 'domain';
    }
  }
  copy() {
    copy(this.activeAccount.address);
    const copyToClipboard = this.translate.instant(
      'OVERVIEWCOMPONENT.COPIEDTOCLIPBOARD'
    );
    this.messageService.add(this.activeAccount.address + ' ' + copyToClipboard, 5);
  }

  toggleDropdown(sel) {
    document.querySelector(sel).parentNode.classList.toggle('expanded');
  }
  newAccount() {
    ModalComponent.currentModel.next({ name: 'new-implicit', data: null });
  }

  async getDelegateName(address: string) {
    return address ? (await this.delegateService.resolveDelegateByAddress(address))?.name ?? address.substring(0, 7) + '...' + address.substring(address.length - 5, address.length -1) : address;
  }
}
