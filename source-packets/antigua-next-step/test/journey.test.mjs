import { describe, expect, it } from 'bun:test';
import { employeeBand, recommend, profileAnswers, nextAfterProfile, OFFERS, SEMINAR, SIZES, sizePath, seatSalesOpen, SEAT_SALES_CLOSE_AT } from '../src/journey.mjs';
describe('Antigua next-step facts and recognition',()=>{
 it('reuses known facts and asks only missing questions',()=>{
  const known=profileAnswers({employeeMin:5,employeeMax:9,priority:'sales'});
  expect(known).toEqual({employees:'5_9',priority:'sales'});expect(nextAfterProfile(known)).toBe('offers');
  expect(nextAfterProfile(profileAnswers({employeeMin:0,employeeMax:0}))).toBe('offers');
  expect(nextAfterProfile(profileAnswers({priority:'ai'}))).toBe('employees');
 });
 it('does not guess size from missing, negative or overlapping ranges',()=>{
  for(const profile of [{},{employeeMin:0,employeeMax:null},{employeeMin:3,employeeMax:8},{employeeMin:-1,employeeMax:0}])expect(employeeBand(profile)).toBeNull();
  expect(employeeBand({employeeMin:10,employeeMax:null})).toBe('10_plus');
 });
 it('provides recommendations without hiding alternatives or assuming headcount',()=>{
  expect(recommend('10_plus','operations')).toBe('onsite');expect(recommend('solo','sales')).toBe('solo');
  expect(recommend('1_4','ai')).toBe('group');expect(recommend('unknown','sales')).toBeNull();expect(recommend('solo','tailored')).toBe('onsite');
  expect(OFFERS).toHaveLength(5);expect(OFFERS.some(o=>o.id==='dinner')).toBe(true);
 });
 it('retains authoritative package terms and never activates a checkout',()=>{
  const text=JSON.stringify(OFFERS);expect(text).not.toMatch(/six additional|six monthly calls|buy.stripe.com/);
  expect(OFFERS.find(o=>o.id==='onsite').billing).toContain('all taxes');expect(OFFERS.find(o=>o.id==='onsite').included.join(' ')).toContain('one 2-hour private virtual consultation on a later mutually agreed date, at no extra charge and with no expiry deadline');
  expect(OFFERS.find(o=>o.id==='group').summary).toContain('first six months');
  expect(OFFERS.find(o=>o.id==='dinner').included.join(' ')).toContain('TWO private');
  expect(OFFERS.every(o=>!o.checkoutUrl)).toBe(true);
  expect(SEMINAR.id).not.toBe('group');expect(SEMINAR.timing).toContain('do not include a seminar seat');expect(SEMINAR.included.join(' ')).toContain('7:15');
 });
});

import {initialAnswer,formReady,publishedAnswers} from '../src/submission.mjs';
it('maps published contact fields without asking known details or trusting a client email',()=>{
 const config={schemaVersion:1,revision:2,fields:[{id:'email',type:'email'},{id:'full_name',type:'text'},{id:'phone',type:'phone'},{id:'next_step_offer',type:'select'}],consent:{marketing:{required:false}},spam:{turnstile:{required:false}}};
 const profile={email:'person@example.test',name:'Ava Example',phone:'+1 268 555 0101'},choice={selected:'group'};
 expect(formReady(config)).toBe(true);expect(formReady({...config,fields:[{id:'contact_email',type:'text',icpField:'email'},{id:'next_step_offer',type:'select'}]})).toBe(false);expect(formReady({...config,fields:[...config.fields.filter(f=>f.id!=='next_step_offer'),{id:'next_step_offer',type:'select',required:true,options:['Label only']}]},{selected:'group'})).toBe(false);expect(formReady({...config,spam:{turnstile:{required:true}}})).toBe(false);expect(formReady({...config,fields:[]})).toBe(false);
 expect(initialAnswer({id:'first_name'},profile,choice)).toBe('Ava');expect(initialAnswer({id:'last_name'},profile,choice)).toBe('Example');
 const values=new FormData();values.set('email','other@example.test');values.set('full_name','Updated name');values.set('next_step_offer','dinner');
 expect(publishedAnswers(config,profile,choice,values)).toEqual({email:'person@example.test',full_name:'Updated name',phone:'+1 268 555 0101',next_step_offer:'group'});
});

import {providerLinks,verifiedProviderLink} from '../src/native-offers.mjs';
it('uses only exact reviewed provider destinations and fixed inclusive USD prices',()=>{
 expect(verifiedProviderLink('seminar_seat').amount).toBe(24900);expect(verifiedProviderLink('onsite').amount).toBe(94900);expect(verifiedProviderLink('onsite',{onsite:{...providerLinks.onsite,enabled:false}})).toBeNull();expect(verifiedProviderLink('group')).toBeNull();
 expect(verifiedProviderLink('seminar_seat',{seminar_seat:{...providerLinks.seminar_seat,url:'https://buy.stripe.com/28EbJ32uc4QOfAV11kgA803?amount=1'}})).toBeNull();
 expect(verifiedProviderLink('onsite',{onsite:{...providerLinks.onsite,amount:100}})).toBeNull();
 expect(providerLinks.seminar_seat.capacity).toBe(5);expect(providerLinks.onsite.capacity).toBe(3);
});

it('retains exact size thresholds, two solo primary paths and the confirmed noon sales deadline',()=>{
 expect(SIZES.map(row=>row[0])).toEqual(['solo','1_4','5_9','10_plus']);expect(sizePath('solo').offers).toEqual(['solo','free']);expect(sizePath('10_plus').offers).toEqual(['onsite','virtual']);expect(seatSalesOpen(SEAT_SALES_CLOSE_AT-1)).toBe(true);expect(seatSalesOpen(SEAT_SALES_CLOSE_AT)).toBe(false);expect(new Date(SEAT_SALES_CLOSE_AT).toISOString()).toBe('2026-10-27T16:00:00.000Z');
});
