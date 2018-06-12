import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';

import { OmniboxComponent } from './omnibox.component';
import { OmniboxService } from './omnibox.service';

@NgModule({
    imports: [
        CommonModule,
        SharedModule
    ],
    declarations: [
        OmniboxComponent
    ],
    exports: [
        OmniboxComponent
    ],
    providers: [
        OmniboxService
    ]
})
export class OmniboxModule { }
