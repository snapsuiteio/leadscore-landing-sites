/** Finite, anonymous logical choices. No answers, URLs, identity or vendor configuration. */
export const WIZARD_CHOICES = Object.freeze([
 'entry_work','entry_learn','path_switch_work','path_switch_learn','nav_back','nav_home',
 'size_solo','size_1_4','size_5_9','size_10_plus','size_organization',
 'org_step_2','org_step_3','org_back','org_clear','org_submit','org_invalid','org_error','org_saved',
 'offer_onsite','offer_virtual','offer_group','offer_solo','offer_seminar_seat','offer_dinner',
 'group_operations','group_sales','group_both','solo_course_added','solo_course_removed',
 'course_details_intro','course_details_org','courses_link_sidebar','courses_link_dialog',
 'free_open','free_close','free_download_checklist','free_download_ai_workflow',
 'outbound_stripe','outbound_calendly','explore_options'
]);
export const CHOICE_TTL_MS = 90 * 86400000;
export const CHOICE_CAPACITY = 200;
export const CHOICE_BATCH_SIZE = 10;
export const isWizardChoice = value => WIZARD_CHOICES.includes(value);
