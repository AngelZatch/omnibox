import { Component, OnInit, EventEmitter, Input, Output } from '@angular/core';
import * as _ from 'lodash';

// Models
import { Device } from '../../shared/model/device.model';
import { DeviceGroup } from '../../shared/model/device-group.model';
import { DeviceType } from '../../shared/model/device-type.model';
import { Entity } from '../../shared/model/entity.model';
import { User } from '../../shared/model/user.model';
import { Dashboard } from '../../shared/model/dashboard.model';

// Services
import { DeviceService } from '../../shared/service/device.service';
import { DeviceTypeService } from '../../shared/service/device-type.service';
import { DeviceGroupService } from '../../shared/service/device-group.service';
import { EntityService } from '../../shared/service/entity.service';
import { UserService } from '../../shared/service/user.service';

/**
 * Gives a method to filter data by several criteria.
 *
 * The flow goes as folllows when the user begins interacting with the omnibox:
 * - The omnibox suggests a list of filters (entity, device, group...)
 * - Once the user has chosen, the omnibox will fetch data from APIs to suggest the completion of the criterion
 * - Once the criterion is finished, it's added to the others and the data are filtered
 *
 * A criterion is built from a type and a value, like so: 'type: value' (e.g.: 'groupe: HP101').
 *
 * @export
 * @class OmniboxComponent
 * @implements {OnInit}
 */
@Component({
    selector: 'app-omnibox',
    templateUrl: './omnibox.component.html',
    styleUrls: ['./omnibox.component.scss'],
    providers: [UserService, EntityService, DeviceTypeService, DeviceService, DeviceGroupService]
})
export class OmniboxComponent implements OnInit {
    public connectedUser = JSON.parse(localStorage.getItem('user'));
    /**
     * The object containing all the active criteria that will apply to data to filter them
     *
     * Once full, the activeCriteria object has this structure:
     * {
     *    type: [values],
     *    type: [values],
     *    ...
     * }
     *
     * Each type ('type', 'groupe', 'equipement'...) contains an array of values, allowing for an infinite set
     * of combining filters
     *
     * @memberof OmniboxComponent
     */
    activeCriteria = {};

    /**
     * The criteria on a form that's suitable to be displayed. It's a plain array of criteria
     *
     * @memberof OmniboxComponent
     */
    displayCriteria = [];

    /**
     * List of available types for the criteria
     *
     * @memberof OmniboxComponent
     */
    availableCriteriaTypes = [];

    /**
     * Model map for the omnibox to know where to look and what to filter for every models
     * of the application it supports
     *
     * @memberof OmniboxComponent
     */
    modelMap = [
        {
            model: DeviceGroup,
            map: [
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
        },
        {
            model: Device,
            map: [
                {
                    name: 'nom',
                    fields: ['name'],
                    helpText: 'nom'
                },
                {
                    name: 'contient',
                    fields: ['sensors'],
                    helpText: 'capteurs'
                },
                {
                    name: 'etat',
                    fields: ['flag'],
                    helpText: 'état'
                },
                {
                    name: 'de',
                    fields: ['entity_id'],
                    helpText: 'entité'
                },
                {
                    name: 'type',
                    fields: ['deviceTypes'],
                    helpText: 'type d\'équipement'
                }
            ]
        }
    ];

    /**
     * List of available values for the criteria, accessible once the type is selected
     *
     * @memberof OmniboxComponent
     */
    availableValues = [];

    /**
     * The current criterion, built by the user in the two steps
     *
     * @memberof OmniboxComponent
     */
    currentCriterion;

    /**
     * The current step in the creation of the criterion. It can be 'select' or 'fill'
     *
     * @memberof OmniboxComponent
     */
    step = 'select';

    /**
     * The Regular Expression to parse a criterion in its string form. Used when adding a finished criterion
     * or when removing a criterion from the list of activeCriteria.
     *
     * @memberof OmniboxComponent
     */
    criterionRegex = new RegExp(/(\w+): ([\w\s\-]+)/g);

    @Input() elements: (DeviceGroup | Device)[] = [];
    filteredElements: DeviceGroup[] = [];
    @Output() filteredResult = new EventEmitter<DeviceGroup[]>();

    constructor(
        private userService: UserService,
        private entityService: EntityService,
        private deviceGroupService: DeviceGroupService,
        private deviceTypeService: DeviceTypeService,
        private deviceService: DeviceService
    ) { }

    ngOnInit() {
        if (this.elements.length > 0) {
            this.buildAvailableCriteriaTypes();
        }
    }

    /**
     * Builds the array of available types of the omnibox depending on the type of the model
     *
     * @memberof OmniboxComponent
     */
    buildAvailableCriteriaTypes() {
        const matchingEntry = this.modelMap.filter((entry) => {
            return (this.elements[0] instanceof entry.model);
        })[0];
        this.availableCriteriaTypes = matchingEntry.map;
    }

    /**
     * Selects an empty criterion to list of searchCriteria
     *
     * @param {string} criterion
     * @memberof OmniboxComponent
     */
    selectCriterion(criterion: string) {
        this.nextStep(criterion);
    }

    /**
     * Fills the selected criterion with the selected choice
     *
     * @param {string} choice
     * @memberof OmniboxComponent
     */
    fillCriterion(choice: string) {
        // FIXME: If the user already started typing to fill, remove what he typed and replace.
        this.currentCriterion += choice;

        // Now that the criterion is filled, we can add it to the list of active criteria
        this.addCriterion();
    }

    /**
     * Adds a finished criterion to the list of activeCriteria.
     *
     * @memberof OmniboxComponent
     */
    addCriterion() {
        const regex = new RegExp(/(\w+): ([\w\s\-]+)/g);
        const res = regex.exec(this.currentCriterion);

        // TODO: Check for this
        const type = res[1];
        const value = res[2];

        if (type && value) {
            this.displayCriteria.push(this.currentCriterion);

            if (!_.has(this.activeCriteria, type)) {
                this.activeCriteria[type] = [];
            }

            this.activeCriteria[type].push(value);

            this.resetStep();
            this.filter();
        }
    }

    /**
     * Removes a criterion from the list of active criteria
     *
     * @param {string} criterion
     * @memberof OmniboxComponent
     */
    removeCriterion(criterion: string) {
        const regex = new RegExp(/(\w+): ([\w\s\-]+)/g);

        const res = regex.exec(criterion);

        const type = res[1];
        const value = res[2];

        // Removes the criterion from the list of activeCriteria
        let valueIndex = this.activeCriteria[type].indexOf(value);
        this.activeCriteria[type].splice(valueIndex, 1);

        // If the type doesn't have anymore values, it's removed from the list
        if (this.activeCriteria[type].length === 0) {
            this.activeCriteria = _.omit(this.activeCriteria, type);
        }

        // Remove the criterion from the display list
        valueIndex = this.displayCriteria.indexOf(criterion);
        this.displayCriteria.splice(valueIndex, 1);

        // Refresh the filtered data
        this.filter();
    }

    /**
     * Triggers everytime the input changes.
     *
     * Will reset the step if the input is emptied, or go to the fill step if the user wrote the
     * criteria himself. That kind of thing
     *
     * @memberof OmniboxComponent
     */
    adaptSearch() {
        // If the input is emptied, we reset the step
        if (this.currentCriterion === '') {
            this.resetStep();
        }

        // If the user typed a criteria, we automatically go to the next step
        if (_.findIndex(this.availableCriteriaTypes, { name: this.currentCriterion }) !== -1) {
            this.nextStep();
        }
    }

    /**
     * Resets the process of criterion selection
     *
     * @memberof OmniboxComponent
     */
    resetStep() {
        this.step = 'select';
        this.currentCriterion = '';
    }

    /**
     * Goes to the next step in creating a criterion
     *
     * @param {any} [selectedCriterion]
     * @memberof OmniboxComponent
     */
    nextStep(selectedCriterion?) {
        if (selectedCriterion) {
            this.fetchDataFromApi(selectedCriterion);
            this.currentCriterion = selectedCriterion + ': ';
        } else {
            this.fetchDataFromApi(this.currentCriterion);
            this.currentCriterion = this.currentCriterion + ': ';
        }
        this.step = 'fill';
    }

    /**
     * Gets data from the APIs, according to the type of the criterion
     *
     * @param {string} criterionType The currently selected type by the user
     * @memberof OmniboxComponent
     */
    fetchDataFromApi(criterionType: string) {
        this.availableValues = [];
        switch (criterionType) {
            case 'type':
                this.deviceTypeService.index().subscribe(
                    (types: DeviceType[]) => {
                        types.forEach((type: DeviceType) => {
                            this.availableValues.push(type.name);
                        })
                    }
                );
                break;

            case 'equipement':
                this.deviceService.index().subscribe(
                    (devices: Device[]) => {
                        devices.forEach((device: Device) => {
                            this.availableValues.push(device.name);
                        });
                    }
                )
                break;

            case 'groupe':
                this.deviceGroupService.index(false).subscribe(
                    (groups: DeviceGroup[]) => {
                        groups.forEach((group: DeviceGroup) => {
                            this.availableValues.push(group.name);
                        })
                    }
                )
                break;

            case 'entite':
                this.entityService.index().subscribe(
                    (entities: Entity[]) => {
                        entities.forEach((entity: Entity) => {
                            this.availableValues.push(entity.name)
                        });
                    }
                )
                break;

            default: // If the type is inexistent
                break;
        }
    }

    filter() {
        // console.log('=========== NEW SEARCH ===========');
        const cleanElements = _.cloneDeep(this.elements);
        this.filteredElements = cleanElements;

        // console.log('ITEMS TO FILTER ON: ', cleanElements);

        // console.log('ACTIVE CRITERIA: ', this.activeCriteria);

        if (!_.isEmpty(this.activeCriteria)) {
            this.filteredElements = [];

            // We get all types to filter
            const filterTypes = Object.keys(this.activeCriteria);

            // Iterate over all types found in the criteria
            let rawTypeResults = [];
            filterTypes.forEach(type => {
                // console.log('CURRENT TYPE OF CRITERION: ' + type);

                // Check if type exists
                const currentType = _.find(this.availableCriteriaTypes, { name: type });
                if (currentType) {
                    // console.log('AVAILABLE FIELDS FOR TYPE ' + type + ': ', currentType.fields);

                    // Iterate over all fields for the current criterion
                    let fieldResults = [];
                    currentType.fields.forEach((field) => {
                        // console.log('CURRENT FIELD FOR MODEL: ' + field);

                        // Iterate over all values for the current criterion
                        this.activeCriteria[type].forEach((value: string) => {
                            // console.log('CURRENT VALUE OF CRITERION: ' + value);

                            // Iterate over all elements
                            let valueMatches = cleanElements.filter((element) => {
                                // console.log('CURRENT ELEMENT: ', element[field]);
                                if (!_.isEmpty(element[field])) {
                                    if (typeof (element[field]) === 'string') {
                                        return element[field] === value;
                                    } else {
                                        // console.log('SEARCH IN ARRAY OF OBJECTS');
                                        // Iterate over all sub elements in the element to find a match
                                        return element[field].some((subElement) => {
                                            return subElement.name === value;
                                        })
                                    }
                                }
                            });

                            // console.log('MATCHES FOR VALUE ' + value + ': ', valueMatches);
                            if (valueMatches.length > 0) {
                                if (fieldResults.length === 0) {
                                    fieldResults.push(valueMatches);
                                } else {
                                    const concatenatedFieldResults = _.concat(fieldResults, valueMatches);
                                    fieldResults = concatenatedFieldResults;
                                }
                                fieldResults = _.flatten(_.uniq(fieldResults));
                            }
                        });
                        // console.log('RESULTS FOR FIELD ' + field + ': ', fieldResults);
                        rawTypeResults.push(fieldResults);
                    });

                }
            });
            // console.log('TYPE RESULTS BEFORE INTERSECTION: ', rawTypeResults);
            this.filteredElements = _.intersection(...rawTypeResults);
            // console.log('FINAL RESULT: ', this.filteredElements);
        }
        this.filteredResult.emit(this.filteredElements);
    }
}
