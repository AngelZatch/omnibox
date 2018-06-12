import { TestBed, inject } from '@angular/core/testing';

import { OmniboxService } from './omnibox.service';

describe('OmniboxService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OmniboxService]
    });
  });

  it('should be created', inject([OmniboxService], (service: OmniboxService) => {
    expect(service).toBeTruthy();
  }));
});
