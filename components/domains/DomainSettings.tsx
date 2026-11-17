import { useRouter } from 'next/router';
import { useState } from 'react';
import Icon from '../common/Icon';
import Modal from '../common/Modal';
import { useDeleteDomain, useFetchDomain, useUpdateDomain } from '../../services/domains';
import InputField from '../common/InputField';
import SelectField, { SelectionOption } from '../common/SelectField';
import ToggleField from '../common/ToggleField';

type DomainSettingsProps = {
   domain:DomainType|false,
   closeModal: Function
}

type DomainSettingsError = {
   type: string,
   msg: string,
}

const DomainSettings = ({ domain, closeModal }: DomainSettingsProps) => {
   const router = useRouter();
   const [currentTab, setCurrentTab] = useState<'notification'|'searchconsole'|'scraping'>('scraping');
   const [showRemoveDomain, setShowRemoveDomain] = useState<boolean>(false);
   const [settingsError, setSettingsError] = useState<DomainSettingsError>({ type: '', msg: '' });
   const [domainSettings, setDomainSettings] = useState<DomainSettings>(() => ({
      notification_interval: domain && domain.notification_interval ? domain.notification_interval : 'never',
      notification_emails: domain && domain.notification_emails ? domain.notification_emails : '',
      search_console: domain && domain.search_console ? JSON.parse(domain.search_console) : {
         property_type: 'domain', url: '', client_email: '', private_key: '',
      },
      scrape_strategy: (domain && domain.scrape_strategy as ScrapeStrategy | '' | undefined) || '',
      scrape_pagination_limit: (domain && domain.scrape_pagination_limit) || 0,
      scrape_smart_full_fallback: (domain && domain.scrape_smart_full_fallback) || false,
      subdomain_matching: (domain && domain.subdomain_matching) || '',
   }));

   const { mutate: updateMutate, error: domainUpdateError, isLoading: isUpdating } = useUpdateDomain(() => closeModal(false));
   const { mutate: deleteMutate } = useDeleteDomain(() => { closeModal(false); router.push('/domains'); });

   // Get the Full Domain Data along with the Search Console API Data.
   useFetchDomain(router, domain && domain.domain ? domain.domain : '', (domainObj:DomainType) => {
      const currentSearchConsoleSettings = domainObj.search_console && JSON.parse(domainObj.search_console);
      setDomainSettings({ ...domainSettings, search_console: currentSearchConsoleSettings || domainSettings.search_console });
   });

   const updateDomain = () => {
      let error: DomainSettingsError | null = null;
      if (domainSettings.notification_emails) {
         const notification_emails = domainSettings.notification_emails.split(',');
         const invalidEmails = notification_emails.find((x) => /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,15})+$/.test(x) === false);
         console.log('invalidEmails: ', invalidEmails);
         if (invalidEmails) {
            error = { type: 'email', msg: 'Email không hợp lệ' };
         }
      }
      if (error && error.type) {
         console.log('Error!!!!!');
         setSettingsError(error);
         setTimeout(() => {
            setSettingsError({ type: '', msg: '' });
         }, 3000);
      } else if (domain) {
            updateMutate({ domainSettings, domain });
         }
   };

   const tabStyle = `inline-block px-4 py-2 rounded-md mr-3 cursor-pointer text-sm select-none z-10
                     text-gray-600 border border-b-0 relative top-[1px] rounded-b-none`;
   const strategyOptions: SelectionOption[] = [
      { label: 'Dùng cài đặt chung', value: '' },
      { label: 'Cơ bản (chỉ trang đầu — 10 kết quả)', value: 'basic' },
      { label: 'Tùy chỉnh (tự chọn số trang)', value: 'custom' },
      { label: 'Thông minh (dựa trên thứ hạng lần trước)', value: 'smart' },
   ];
   const paginationLimitOptions: SelectionOption[] = Array.from({ length: 10 }, (_, i) => (
      { label: `${i + 1} trang`, value: String(i + 1) }
   ));
   return (
      <div>
         <Modal closeModal={() => closeModal(false)} title={'Cài đặt website'} width="[500px]" verticalCenter={currentTab === 'searchconsole'} >
            <div data-testid="domain_settings" className=" text-sm">
               <div className=' mt-3 mb-5 border  border-slate-200 px-2 py-4 pb-0
               relative left-[-20px] w-[calc(100%+40px)] border-l-0 border-r-0 bg-[#f8f9ff]'>
                  <ul>
                     <li
                     className={`${tabStyle} ${currentTab === 'scraping' ? ' bg-white text-blue-600 border-slate-200' : 'border-transparent'}`}
                     onClick={() => setCurrentTab('scraping')}>
                        <Icon type='scraper' /> Lấy thứ hạng
                     </li>
                     <li
                     className={`${tabStyle} ${currentTab === 'notification' ? ' bg-white text-blue-600 border-slate-200' : 'border-transparent'} `}
                     onClick={() => setCurrentTab('notification')}>
                       <Icon type='email' /> Thông báo
                     </li>
                     <li
                     className={`${tabStyle} ${currentTab === 'searchconsole' ? ' bg-white text-blue-600 border-slate-200' : 'border-transparent'}`}
                     onClick={() => setCurrentTab('searchconsole')}>
                        <Icon type='google' /> Search Console
                     </li>
                  </ul>
               </div>

               <div>
                  {currentTab === 'notification' && (
                     <div className="mb-4 flex justify-between items-center w-full">
                        <InputField
                        label='Email nhận thông báo'
                        onChange={(emails:string) => setDomainSettings({ ...domainSettings, notification_emails: emails })}
                        value={domainSettings.notification_emails || ''}
                        placeholder='Email của bạn, cách nhau bằng dấu phẩy'
                        />
                     </div>
                  )}
                  {currentTab === 'searchconsole' && (
                     <>
                        <div className="mb-4 flex justify-between items-center w-full">
                           <label className='mb-2 font-semibold inline-block text-sm text-gray-700'>Loại thuộc tính</label>
                           <SelectField
                           options={[{ label: 'Tên miền', value: 'domain' }, { label: 'URL', value: 'url' }]}
                           selected={[domainSettings.search_console?.property_type || 'domain']}
                           defaultLabel="Chọn loại thuộc tính Search Console"
                           updateField={(updated:['domain'|'url']) => setDomainSettings({
                              ...domainSettings,
                              search_console: { ...(domainSettings.search_console as DomainSearchConsole), property_type: updated[0] || 'domain' },
                           })}
                           multiple={false}
                           rounded={'rounded'}
                           />
                        </div>
                        {domainSettings?.search_console?.property_type === 'url' && (
                           <div className="mb-4 flex justify-between items-center w-full">
                              <InputField
                              label='Địa chỉ thuộc tính (bắt buộc)'
                              onChange={(url:string) => setDomainSettings({
                                 ...domainSettings,
                                 search_console: { ...(domainSettings.search_console as DomainSearchConsole), url },
                              })}
                              value={domainSettings?.search_console?.url || ''}
                              placeholder='Địa chỉ thuộc tính Search Console, ví dụ: https://trangcuaban.com/'
                              />
                           </div>
                        )}
                        <div className="mb-4 flex justify-between items-center w-full">
                           <InputField
                           label='Client Email của Search Console'
                           onChange={(client_email:string) => setDomainSettings({
                              ...domainSettings,
                              search_console: { ...(domainSettings.search_console as DomainSearchConsole), client_email },
                           })}
                           value={domainSettings?.search_console?.client_email || ''}
                           placeholder='myapp@appspot.gserviceaccount.com'
                           />
                        </div>
                        <div className="mb-4 flex flex-col justify-between items-center w-full">
                           <label className='mb-2 font-semibold block text-sm text-gray-700 w-full'>Private Key của Search Console</label>
                           <textarea
                              className={`w-full p-2 border border-gray-200 rounded mb-3 text-xs 
                              focus:outline-none h-[100px] focus:border-blue-200`}
                              value={domainSettings?.search_console?.private_key || ''}
                              placeholder={'-----BEGIN PRIVATE KEY-----/ssssaswdkihad....'}
                              onChange={(event) => setDomainSettings({
                                 ...domainSettings,
                                 search_console: { ...(domainSettings.search_console as DomainSearchConsole), private_key: event.target.value },
                              })}
                           />
                        </div>
                     </>
                  )}
                  {currentTab === 'scraping' && (
                     <div className="mb-4">
                        <div className="mb-4">
                           <InputField
                              label='Khớp tên miền phụ'
                              onChange={(val:string) => setDomainSettings({ ...domainSettings, subdomain_matching: val })}
                              value={domainSettings.subdomain_matching || ''}
                              placeholder='amp, blog, * (cách nhau bằng dấu phẩy)'
                           />
                        </div>
                        <div className="mb-5">
                           <SelectField
                              label='Chiến lược lấy thứ hạng riêng cho website này'
                              options={strategyOptions}
                              selected={[domainSettings.scrape_strategy || '']}
                              defaultLabel="Dùng cài đặt chung"
                              updateField={(updated:string[]) => {
                                 setDomainSettings({ ...domainSettings, scrape_strategy: (updated[0] || '') as ScrapeStrategy | '' });
                              }}
                              multiple={false}
                              rounded={'rounded'}
                              minWidth={220}
                           />
                        </div>
                        {domainSettings.scrape_strategy === 'custom' && (
                           <div className="mb-4">
                              <SelectField
                                 label='Số trang kết quả Google cần kiểm tra'
                                 options={paginationLimitOptions}
                                 selected={[String(domainSettings.scrape_pagination_limit || 5)]}
                                 defaultLabel="Chọn số trang"
                                 updateField={(updated:string[]) => {
                                    setDomainSettings({ ...domainSettings, scrape_pagination_limit: parseInt(updated[0] || '5', 10) });
                                 }}
                                 multiple={false}
                                 rounded={'rounded'}
                                 minWidth={220}
                              />
                              <small className='text-gray-500 pt-2 block'>Mỗi trang có tối đa 10 kết quả.</small>
                           </div>
                        )}
                        {domainSettings.scrape_strategy === 'smart' && (
                           <div className="mb-5">
                              <ToggleField
                                 label='Dự phòng đầy đủ: kiểm tra tất cả các trang nếu không thấy ở các trang gần đó'
                                 value={!!domainSettings.scrape_smart_full_fallback}
                                 onChange={(val: boolean) => {
                                    setDomainSettings({ ...domainSettings, scrape_smart_full_fallback: val });
                                 }}
                              />
                              <small className='text-gray-500 pt-2 block'>
                                 Khi bật, cả 10 trang sẽ được kiểm tra nếu không thấy từ khóa ở các trang gần vị trí cũ.
                              </small>
                           </div>
                        )}
                     </div>
                  )}
               </div>
               {!isUpdating && (domainUpdateError as Error)?.message && (
                  <div className='w-full mt-4 p-3 text-sm bg-red-50 text-red-700'>{(domainUpdateError as Error).message}</div>
               )}
               {!isUpdating && settingsError?.msg && (
                  <div className='w-full mt-4 p-3 text-sm bg-red-50 text-red-700'>{settingsError.msg}</div>
               )}
            </div>

            <div className="flex justify-between border-t-[1px] border-gray-100 mt-8 pt-4 pb-0">
               <button
               className="text-sm font-semibold text-red-500"
               onClick={() => setShowRemoveDomain(true)}>
                  <Icon type="trash" /> Xóa website
               </button>
               <button
               className={`text-sm font-semibold py-2 px-5 rounded cursor-pointer bg-blue-700 text-white ${isUpdating ? 'cursor-not-allowed' : ''}`}
               onClick={() => !isUpdating && updateDomain()}>
                  {isUpdating && <Icon type='loading' />} Lưu cài đặt
               </button>
            </div>
         </Modal>
         {showRemoveDomain && domain && (
            <Modal closeModal={() => setShowRemoveDomain(false) } title={`Xóa website ${domain.domain}`}>
               <div className='text-sm'>
                  <p>Bạn có chắc muốn xóa website này? Xóa website sẽ xóa luôn tất cả từ khóa của nó.</p>
                  <div className='mt-6 text-right font-semibold'>
                     <button
                     className=' py-1 px-5 rounded cursor-pointer bg-indigo-50 text-slate-500 mr-3'
                     onClick={() => setShowRemoveDomain(false)}>
                        Hủy
                     </button>
                     <button
                     className=' py-1 px-5 rounded cursor-pointer bg-red-400 text-white'
                     onClick={() => deleteMutate(domain)}>
                        Xóa

                     </button>
                  </div>
               </div>
            </Modal>
         )}
      </div>
   );
};

export default DomainSettings;
