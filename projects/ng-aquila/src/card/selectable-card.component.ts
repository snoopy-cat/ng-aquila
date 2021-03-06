import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ContentChildren,
  DoCheck,
  EventEmitter,
  forwardRef,
  Input,
  Optional,
  Output,
  QueryList,
  Self,
} from '@angular/core';
import { Component } from '@angular/core';
import { Subject } from 'rxjs';
import { coerceBooleanProperty, BooleanInput } from '@angular/cdk/coercion';
import { ErrorStateMatcher } from '@aposin/ng-aquila/utils';

import {
  ControlValueAccessor,
  FormControl,
  FormGroupDirective,
  NgControl,
  NgForm
} from '@angular/forms';
import { SelectableCard } from './selectable-card';
import { NxSelectableCardChangeEvent } from './selectable-card-change-event';
import { NxErrorComponent } from '@aposin/ng-aquila/base';

let nextId = 0;

@Component({
  selector: 'nx-selectable-card',
  templateUrl: './selectable-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./selectable-card.component.scss'],
  providers: [{provide: SelectableCard, useExisting: forwardRef(() => NxSelectableCardComponent)}],
  host: {
    '[class.is-checked]': 'checked',
    '[class.is-disabled]': 'disabled',
    '[class.has-error]': 'errorState',
    '[attr.aria-invalid]': 'errorState',
    '[attr.role]': '"checkbox"',
    '[attr.aria-checked]': 'checked'
  }
})

export class NxSelectableCardComponent extends SelectableCard implements ControlValueAccessor, DoCheck, AfterContentInit {
  private _id: string = (nextId++).toString();
  private _checked = false;
  private _disabled: boolean = false;
  private _value: string;
  private _name: string;
  private _negative: boolean = false;
  private _tabindex: string = '0';
  private _required: boolean;
  /** @docs-private */
  _errorListIds: string = '';

  /** @docs-private */
  @ContentChildren(NxErrorComponent) _errorList: QueryList<NxErrorComponent>;

  /** @docs-private */
  errorState: boolean = false;

  /** @docs-private */
  stateChanges = new Subject<void>();

  /** An event is dispatched each time the selectable card value is changed */
  @Output()
  selectionChange: EventEmitter<NxSelectableCardChangeEvent> = new EventEmitter<NxSelectableCardChangeEvent>();

  /** An event is dispatched each time the selectable card value is changed */
  @Output() checkedChange = new EventEmitter<boolean>();

  /**
   * Id of the selectable card.
   *
   * If not set, the selectable card gets an incremented value by default.
   */
  @Input()
  set id(value: string) {
    if (value !== this._id) {
      this._id = value;
      this._changeDetectorRef.markForCheck();
    }
  }

  get id() {
    return `nx-selectable-card-${this._id}`;
  }

  /** Whether the selectable card  is checked. */
  @Input()
  set checked(value: boolean) {
    const newValue = coerceBooleanProperty(value);
    if (newValue !== this._checked) {
      this._checked = newValue;
      this._changeDetectorRef.markForCheck();
    }
  }

  get checked() {
    return this._checked;
  }

  /** The value attribute of the native input element  */
  @Input()
  get value(): string {
    return this._value;
  }

  set value(value: string) {
    if (value) {
      this._value = value;
    }

    this._changeDetectorRef.markForCheck();
  }

  /** Whether the selectable card is disabled. */
  @Input()
  set disabled(value: boolean) {
    const newValue = coerceBooleanProperty(value);
    if (newValue !== this._disabled) {
      this._disabled = newValue;
      this._changeDetectorRef.markForCheck();
    }
  }

  get disabled(): boolean {
    return this._disabled || null;
  }

  /** Whether the selectable card is negative. */
  @Input()
  set negative(value: boolean) {
    const newValue = coerceBooleanProperty(value);
    if (newValue !== this._negative) {
      this._negative = newValue;
      this._changeDetectorRef.markForCheck();
    }
  }

  get negative(): boolean {
    return this._negative || null;
  }

  /** Whether the selectable card is required. */
  @Input()
  get required(): boolean {
    return this._required;
  }

  set required(value: boolean) {
    this._required = coerceBooleanProperty(value);
  }

  /** Name of the selectable card. */
  @Input()
  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  /** The tabIndex of the element */
  @Input()
  get tabindex(): string {
    if (this.disabled) {
      return '-1';
    }

    return this._tabindex;
  }

  set tabindex(value: string) {
    this._tabindex = value;
  }

  constructor(private _changeDetectorRef: ChangeDetectorRef,
              private _errorStateMatcher: ErrorStateMatcher,
              @Self() @Optional() public ngControl: NgControl,
              @Optional() private _parentForm: NgForm,
              @Optional() private _parentFormGroup: FormGroupDirective
  ) {
    super();

    if (this.ngControl) {
      // Note: we provide the value accessor through here, instead of
      // the `providers` to avoid running into a circular import.
      this.ngControl.valueAccessor = this;
    }
  }

  ngAfterContentInit() {
    this._errorList.changes.subscribe((value) => {
      this._errorListIds = value.map((errorItem: NxErrorComponent) => {
        return errorItem.id;
      }).join(' ');
      this._changeDetectorRef.markForCheck();
    });

    this._errorListIds = this._errorList.map((errorItem: NxErrorComponent) => {
      return errorItem.id;
    }).join(' ');
  }

  /** @docs-private */
  onChangeCallback = (_: any) => {};

  registerOnChange(fn: any): void {
    this.onChangeCallback = fn;
  }

  onTouchedCallback = (_: any) => {};

  registerOnTouched(onTouched: any): void {
    this.onTouchedCallback = onTouched;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  writeValue(value: any): void {
    this.checked = !!value;
  }

  ngDoCheck() {
    if (this.ngControl) {
      // We need to re-evaluate this on every change detection cycle, because there are some
      // error triggers that we can't subscribe to (e.g. parent form submissions). This means
      // that whatever logic is in here has to be super lean or we risk destroying the performance.
      this.updateErrorState();
    }
  }

  /** @docs-private */
  updateErrorState() {
    const oldState = this.errorState;
    const parent = this._parentFormGroup || this._parentForm;
    const control = this.ngControl ? this.ngControl.control as FormControl : null;
    const newState = this._errorStateMatcher.isErrorState(control, parent);

    if (newState !== oldState) {
      this.errorState = newState;
      this.stateChanges.next();
    }
  }

  /** Toggles the checked state of the selectable card . */
  public toggle() {
    if (!this.disabled) {
      this.checked = !this.checked;
    }
  }

  /** @docs-private */
  _onInputClick(event: Event): void {
    // We have to stop propagation for click events on the visual hidden input element.
    // By default, when a user clicks on a label element, a generated click event will be
    // stop the propagation of the native click on the checkbox input so that a click is not triggered twice
    // Preventing bubbling for the second event will solve that issue.
    event.stopPropagation();
    if (!this.disabled) {
      this.toggle();
      this._emitChangeEvent();
    }
  }

  /** @docs-private */
  _onInteractionEvent(event: Event) {
    // We always have to stop propagation on the change event.
    // Otherwise the change event, from the input element, will bubble up and
    // emit its event object to the `change` output.
    event.stopPropagation();
  }

  /** @docs-private */
  private _emitChangeEvent() {
    const event = new NxSelectableCardChangeEvent(this.checked, this.value, this);
    this.onChangeCallback(this.checked);
    this.selectionChange.emit(event);
    this.checkedChange.emit(this.checked);
  }

  static ngAcceptInputType_checked: BooleanInput;
  static ngAcceptInputType_disabled: BooleanInput;
  static ngAcceptInputType_negative: BooleanInput;
  static ngAcceptInputType_required: BooleanInput;
}
