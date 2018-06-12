import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { BaseRequestOptions, Response, ResponseOptions, Http, HttpModule } from '@angular/http';
import { HttpClientModule } from '@angular/common/http';
import { MockBackend } from '@angular/http/testing';

import { OmniboxComponent } from './omnibox.component';
import { Device } from '../../shared/model/device.model';
import { DeviceGroup } from '../../shared/model/device-group.model';

const device1 = new Device({
    id: 49406,
    name: 'Sonde 433-2-204',
    reference: '196B04',
    address: '3 Allee du parc',
    city: 'THORIGNY',
    zipcode: '79360',
    deviceTypes: [
        'Chaufferie'
    ],
    entity_id: '710',
    uid: 'lyerjhul2x42rw1',
    flag: 'newborn'
});

const device2 = new Device({
    id: '49405',
    name: 'Sonde 433-1-105-1146',
    reference: '196955',
    address: '1 Allee du parc',
    city: 'THORIGNY',
    zipcode: '79360',
    deviceTypes: [
        'Ascenseur'
    ],
    entity_id: '710',
    uid: 'ofwodmy05brqq7p',
});

const device3 = new Device({
    id: '49404',
    name: 'Sonde 433-1-105',
    reference: '196AAF',
    address: '1 Allee du parc',
    city: 'THORIGNY',
    zipcode: '79360',
    deviceTypes: [
        'Chaufferie',
        'Porte de Garage',
        'Sonde Température'
    ],
    entity_id: '710',
    uid: '8b85biepbf4a9h5',
});

const device4 = new Device({
    id: '49401',
    name: 'Equipement Error',
    reference: '163854ED',
    address: null,
    city: 'PARIS 16EME ARRONDISSEMENT',
    zipcode: '75116',
    deviceTypes: [
        'Ascenseur',
        'Chaufferie'
    ],
    entity_id: '604',
    uid: 'c35m7vr2n96ggmq',
});

const deviceGroup1 = new DeviceGroup({
    id: 9,
    name: 'Racine ICF Habitat La Sablière',
    groups: [],
    devices: [device1, device2],
    features: [],
    parent: { id: null, name: null },
    entity_id: '710'
});

const deviceGroup2 = new DeviceGroup({
    id: 10,
    name: 'Foyers',
    groups: [],
    devices: [],
    features: [],
    parent: { id: 9, name: null },
    entity_id: '710'
});

const deviceGroup3 = new DeviceGroup({
    id: 11,
    name: 'Direction Territoriale Sud',
    groups: [],
    devices: [device3],
    features: [],
    parent: { id: 9, name: null },
    entity_id: '710'
});

const deviceGroup4 = new DeviceGroup({
    id: 12,
    name: 'HP 152',
    groups: [],
    devices: [device4],
    features: [],
    parent: { id: 11, name: null },
    entity_id: '710'
});

const groups = [deviceGroup1, deviceGroup2, deviceGroup3, deviceGroup4];

describe('OmniboxComponent', () => {
    let component: OmniboxComponent;
    let fixture: ComponentFixture<OmniboxComponent>;

    let connectedUser = {
        entity_default: 710,
        id: 19421
    };

    beforeEach(async(() => {
        spyOn(localStorage, 'getItem').and.callFake(() => {
            return JSON.stringify(connectedUser);
        });

        TestBed.configureTestingModule({
            declarations: [OmniboxComponent],
            schemas: [NO_ERRORS_SCHEMA],
            providers: [MockBackend, BaseRequestOptions,
                {
                    provide: Http,
                    useFactory: (backend, options) => new Http(backend, options),
                    deps: [MockBackend, BaseRequestOptions]
                }
            ],
            imports: [FormsModule, NgbModule.forRoot(), HttpModule, HttpClientModule]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(OmniboxComponent);
        component = fixture.componentInstance;

        component.elements = groups;

        fixture.detectChanges();
    });

    it('should be created', () => {
        expect(component).toBeTruthy();
    });

    describe('Build and destroy filters', () => {
        it('can select the available criteria by looking at which model it recieved', () => {
            component.buildAvailableCriteriaTypes();

            expect(component.availableCriteriaTypes).toEqual(
                [
                    {
                        name: 'nom',
                        fields: ['name'],
                        helpText: 'nom'
                    },
                    {
                        name: 'contient',
                        fields: ['devices', 'groups', 'features'],
                        helpText: 'équipements, groupes, caractéristiques'
                    },
                    {
                        name: 'de',
                        fields: ['entity_id'],
                        helpText: 'entité'
                    }
                ]
            );
        });

        it('can go to the next step by itself when the user selects the criterion', () => {
            spyOn(component, 'fetchDataFromApi');

            component.selectCriterion('type');

            expect(component.currentCriterion).toEqual('type: ');
            expect(component.step).toEqual('fill');
        });

        it('can go to the next step by itself if the user types the criterion', () => {
            component.currentCriterion = 'contient';

            component.adaptSearch();
            expect(component.currentCriterion).toEqual('contient: ');
            expect(component.step).toEqual('fill');
        });

        it('can reset the step by itself if the user empties the input', () => {
            component.currentCriterion = 'type';
            component.adaptSearch();
            component.currentCriterion = '';
            component.adaptSearch();

            expect(component.step).toEqual('select');
        });

        it('can create a new property in filters', () => {
            const first = 'groupe: HP101';
            const second = 'equipement: Chaufferie C1';

            component.currentCriterion = first;
            component.addCriterion();
            expect(component.activeCriteria).toEqual({
                groupe: ['HP101']
            });

            component.currentCriterion = second;
            component.addCriterion();
            expect(component.activeCriteria).toEqual({
                groupe: ['HP101'],
                equipement: ['Chaufferie C1']
            });
        });

        it('can append to an existing property in filters', () => {
            component.activeCriteria = {
                groupe: ['HP101'],
                equipement: ['Chaufferie C1']
            };

            component.currentCriterion = 'groupe: HP102';
            component.addCriterion();
            expect(component.activeCriteria).toEqual({
                groupe: ['HP101', 'HP102'],
                equipement: ['Chaufferie C1']
            });
        })

        it('can delete an existing value in a property in filters', () => {
            component.activeCriteria = {
                groupe: ['HP101', 'HP102'],
                equipement: ['Chaufferie C1']
            };

            component.removeCriterion('groupe: HP101');
            expect(component.activeCriteria).toEqual({
                groupe: ['HP102'],
                equipement: ['Chaufferie C1']
            });
        });

        it('can delete an existing property in filters', () => {
            component.activeCriteria = {
                groupe: ['HP102'],
                equipement: ['Chaufferie C1']
            };

            component.removeCriterion('groupe: HP102');
            expect(component.activeCriteria).toEqual({
                equipement: ['Chaufferie C1']
            });
        });
    });

    describe('Suggests data', () => {
        it('suggests device types', () => {

        });

        it('suggests devices', () => {

        });

        it('suggests groups', () => {

        });

        it('suggests statuses', () => {

        });

        it('suggests entities', () => {

        });
    })

    describe('Apply filters. General stuff.', () => {
        it('can pass data through untouched if there are no filters', () => {
            component.elements = groups;

            component.activeCriteria = {};

            component.filter();

            expect(component.filteredElements).toEqual(groups);
        });

        it('works even if no data are given', () => {
            component.elements = [];

            component.activeCriteria = {
                contient: ['Sonde 433-1-105']
            };

            component.filter();

            expect(component.filteredElements).toEqual([]);
        });

        it('ignores inexistent types', () => {
            component.elements = groups;

            component.activeCriteria = {
                existe: ['Sonde 433-1-105']
            };

            component.filter();

            expect(component.filteredElements).toEqual([]);
        });
    });

    describe('Apply filters of one type on the properties of an object', () => {
        it('send one value and get matches', () => {
            component.elements = groups;

            component.activeCriteria = {
                nom: ['Foyers']
            };

            component.filter();

            expect(component.filteredElements).toEqual([deviceGroup2]);
        });

        it('send one value and get no matches', () => {
            component.elements = groups;

            component.activeCriteria = {
                contient: ['No matches']
            };

            component.filter();

            expect(component.filteredElements).toEqual([]);
        });

        it('send multiple values with only matches', () => {
            component.elements = groups;

            component.activeCriteria = {
                nom: ['Direction Territoriale Sud', 'HP 152']
            };

            component.filter();

            expect(component.filteredElements).toEqual([deviceGroup3, deviceGroup4]);
        });

        it('send multiple values with some empty matches', () => {
            component.elements = groups;

            component.activeCriteria = {
                nom: ['Direction Territoriale Sud', 'No matches']
            };

            component.filter();

            expect(component.filteredElements).toEqual([deviceGroup3]);
        });

        it('send multiple values with no matches', () => {
            component.elements = groups;

            component.activeCriteria = {
                nom: ['Direction Territoriale Nord', 'Direction Territorial Est']
            };

            component.filter();

            expect(component.filteredElements).toEqual([]);
        });
    });

    describe('Apply filters of one type on the children of an object.', () => {
        it('Send one value and get matches', () => {
            component.elements = groups;

            component.activeCriteria = {
                contient: ['Sonde 433-1-105-1146']
            };

            component.filter();

            expect(component.filteredElements).toEqual([deviceGroup1]);
        });

        it('Send one value and get no matches', () => {
            component.elements = groups;

            component.activeCriteria = {
                contient: ['No matches']
            };

            component.filter();

            expect(component.filteredElements).toEqual([]);
        });

        it('send multiple values with only matches', () => {
            component.elements = groups;

            component.activeCriteria = {
                contient: ['Sonde 433-1-105-1146', 'Sonde 433-1-105']
            };

            component.filter();

            expect(component.filteredElements).toEqual([deviceGroup1, deviceGroup3]);
        });

        it('send multiple values with some empty matches', () => {
            component.elements = groups;

            component.activeCriteria = {
                contient: ['Sonde 433-1-105', 'No matches']
            };

            component.filter();

            expect(component.filteredElements).toEqual([deviceGroup3]);
        });

        it('send multiple values with no matches', () => {
            component.elements = groups;

            component.activeCriteria = {
                contient: ['Direction Territoriale Nord', 'Direction Territorial Est']
            };

            component.filter();

            expect(component.filteredElements).toEqual([]);
        });
    });

    describe('Apply filters. Multiple types', () => {
        it('can filter through multiple types having each one value with only matches', () => {
            component.elements = groups;

            component.activeCriteria = {
                contient: ['Sonde 433-1-105'],
                type: ['Chaufferie']
            };

            component.filter();

            expect(component.filteredElements).toEqual([deviceGroup3]);
        });

        it('can filter through multiple types having each one value with some sending no matches', () => {
            component.elements = groups;

            component.activeCriteria = {
                contient: ['Sonde 433-1-105-1146'],
                nom: ['Chaufferie']
            };

            component.filter();

            expect(component.filteredElements).toEqual([]);
        });

        it('can filter through multiple types having each one value, sending no matches', () => {
            component.elements = groups;

            component.activeCriteria = {
                contient: ['No matches'],
                nom: ['No matches']
            };

            component.filter();

            expect(component.filteredElements).toEqual([]);
        });

        it('can filter through multiple types having multiple values with only matches, with no intersection required', () => {
            component.elements = groups;

            component.activeCriteria = {
                contient: ['Sonde 433-2-204', 'Sonde 433-1-105'],
                nom: ['Racine ICF Habitat La Sablière', 'Direction Territoriale Sud']
            };

            component.filter();

            expect(component.filteredElements).toEqual([deviceGroup1, deviceGroup3]);
        });

        it('can filter through multiple types having multiple values with only matches, with intersections', () => {
            component.elements = groups;

            component.activeCriteria = {
                contient: ['Sonde 433-2-204', 'Sonde 433-1-105'],
                nom: ['Racine ICF Habitat La Sablière', 'Direction Territoriale Sud', 'Foyers']
            };

            component.filter();

            expect(component.filteredElements).toEqual([deviceGroup1, deviceGroup3]);
        });

        it('can filter through multiple types having multiple values with no matches', () => {
            component.elements = groups;

            component.activeCriteria = {
                contient: ['No matches 1', 'No matches 2'],
                de: ['3', '14']
            };

            component.filter();

            expect(component.filteredElements).toEqual([]);
        });

        it('can filter through multiple types having multiple values, with varying degrees of success', () => {
            component.elements = groups;

            component.activeCriteria = {
                contient: ['No matches 1', 'Sonde 433-1-105'],
                nom: ['Racine ICF Habitat La Sablière', 'Direction Territoriale Sud', 'Foyers'],
                de: ['710', '604']
            };

            component.filter();

            expect(component.filteredElements).toEqual([deviceGroup3]);
        });
    });
});
