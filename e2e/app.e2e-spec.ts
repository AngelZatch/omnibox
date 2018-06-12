import { OmniboxPage } from './app.po';

describe('omnibox App', () => {
  let page: OmniboxPage;

  beforeEach(() => {
    page = new OmniboxPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to app!!');
  });
});
