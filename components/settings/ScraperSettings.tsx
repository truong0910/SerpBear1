/* eslint-disable max-len */
import React from 'react';
import InfoTip from '../common/InfoTip';
import { GlossaryKey } from '../../utils/glossary';
import { useClearFailedQueue } from '../../services/settings';
import Icon from '../common/Icon';
import SelectField, { SelectionOption } from '../common/SelectField';
import SecretField from '../common/SecretField';
import ToggleField from '../common/ToggleField';

type ScraperSettingsProps = {
   settings: SettingsType,
   settingsError: null | {
      type: string,
      msg: string
   },
   updateSettings: Function,
}

const ScraperSettings = ({ settings, settingsError, updateSettings }:ScraperSettingsProps) => {
   const { mutate: clearFailedMutate, isLoading: clearingQueue } = useClearFailedQueue(() => {});

   const scrapingOptions: SelectionOption[] = [
      { label: 'Hằng ngày', value: 'daily' },
      { label: 'Cách ngày', value: 'other_day' },
      { label: 'Hằng tuần', value: 'weekly' },
      { label: 'Hằng tháng', value: 'monthly' },
      { label: 'Không bao giờ', value: 'never' },
   ];
   const delayOptions: SelectionOption[] = [
      { label: 'Không chờ', value: '0' },
      { label: '5 giây', value: '5000' },
      { label: '10 giây', value: '10000' },
      { label: '30 giây', value: '30000' },
      { label: '1 phút', value: '60000' },
      { label: '2 phút', value: '120000' },
      { label: '5 phút', value: '300000' },
      { label: '10 phút', value: '600000' },
      { label: '15 phút', value: '900000' },
      { label: '30 phút', value: '1800000' },
   ];
   const strategyOptions: SelectionOption[] = [
      { label: 'Cơ bản (chỉ trang đầu — 10 kết quả)', value: 'basic' },
      { label: 'Tùy chỉnh (tự chọn số trang)', value: 'custom' },
      { label: 'Thông minh (dựa trên thứ hạng lần trước)', value: 'smart' },
   ];
   const paginationLimitOptions: SelectionOption[] = Array.from({ length: 10 }, (_, i) => (
      { label: `${i + 1} trang`, value: String(i + 1) }
   ));
   const allScrapers: SelectionOption[] = settings.available_scrapers ? settings.available_scrapers : [];
   const scraperOptions: SelectionOption[] = [{ label: 'None', value: 'none' }, ...allScrapers];
   const labelStyle = 'mb-2 font-semibold inline-block text-sm text-gray-700';

   return (
      <div>
      <div className='settings__content styled-scrollbar p-6 text-sm'>

         <div className="settings__section__select mb-5">
            <SelectField
            label='Công cụ lấy thứ hạng'
            options={scraperOptions}
            selected={[settings.scraper_type || 'none']}
            defaultLabel="Chọn công cụ"
            updateField={(updatedTime:[string]) => updateSettings('scraper_type', updatedTime[0])}
            multiple={false}
            rounded={'rounded'}
            minWidth={220}
            />
         </div>
         {settings.scraper_type !== 'none' && settings.scraper_type !== 'proxy' && (
            <div className="settings__section__secret mb-5">
               <SecretField
               label='API key hoặc token của công cụ'
               placeholder={'API key/token'}
               value={settings?.scaping_api || ''}
               hasError={settingsError?.type === 'no_api_key'}
               onChange={(value:string) => updateSettings('scaping_api', value)}
               />
            </div>
         )}
         {settings.scraper_type === 'proxy' && (
            <div className="settings__section__input mb-5">
               <label className={labelStyle}>Danh sách proxy</label>
               <textarea
                  className={`w-full p-2 border border-gray-200 rounded mb-3 text-xs 
                  focus:outline-none min-h-[160px] focus:border-blue-200 
                  ${settingsError?.type === 'no_email' ? ' border-red-400 focus:border-red-400' : ''} `}
                  value={settings?.proxy}
                  placeholder={'http://122.123.22.45:5049\nhttps://user:password@122.123.22.45:5049'}
                  onChange={(event) => updateSettings('proxy', event.target.value)}
               />
            </div>
         )}
         {settings.scraper_type !== 'none' && (
            <div className="settings__section__input mb-5">
               <SelectField
                  label='Tần suất cập nhật thứ hạng'
                  multiple={false}
                  selected={[settings?.scrape_interval || 'daily']}
                  options={scrapingOptions}
                  defaultLabel={'Chọn tần suất'}
                  updateField={(updated:string[]) => updated[0] && updateSettings('scrape_interval', updated[0])}
                  rounded='rounded'
                  maxHeight={48}
                  minWidth={220}
               />
               <small className=' text-gray-500 pt-2 block'>Cần khởi động lại ứng dụng để áp dụng.</small>
            </div>
         )}
            <div className="settings__section__input mb-5">
               <SelectField
                  label='Thời gian chờ giữa các từ khóa'
                  multiple={false}
                  selected={[settings?.scrape_delay || '0']}
                  options={delayOptions}
                  defaultLabel={'Chọn thời gian chờ'}
                  updateField={(updated:string[]) => updated[0] && updateSettings('scrape_delay', updated[0])}
                  rounded='rounded'
                  maxHeight={48}
                  minWidth={220}
               />
               <small className=' text-gray-500 pt-2 block'>Cần khởi động lại ứng dụng để áp dụng.</small>
            </div>
            <div className="settings__section__input mb-5">
               <ToggleField
               label='Tự thử lại từ khóa bị lỗi'
               value={!!settings?.scrape_retry }
               onChange={(val) => updateSettings('scrape_retry', val)}
               />
            </div>
            {settings.scraper_type !== 'none' && (
               <div className="settings__section__select mb-5">
                  <SelectField
                     label='Chiến lược lấy thứ hạng'
                     options={strategyOptions}
                     selected={[settings?.scrape_strategy || 'basic']}
                     defaultLabel="Chọn chiến lược"
                     updateField={(updated:string[]) => updated[0] && updateSettings('scrape_strategy', updated[0])}
                     multiple={false}
                     rounded={'rounded'}
                     minWidth={220}
                  />
                  <small className='text-gray-500 pt-2 block'>
                     {(!settings.scrape_strategy || settings.scrape_strategy === 'basic')
                        && 'Chỉ kiểm tra trang đầu (10 kết quả). Nhanh nhất và tốn ít credit nhất.'}
                     {settings.scrape_strategy === 'custom' && 'Mỗi lần cập nhật đều kiểm tra đúng số trang bạn chọn cho mỗi từ khóa.'}
                     {settings.scrape_strategy === 'smart' && 'Kiểm tra trang mà từ khóa xuất hiện lần trước, cộng các trang kế bên.'}
                     <InfoTip term={`strategy_${settings.scrape_strategy || 'basic'}` as GlossaryKey} />
                  </small>
               </div>
            )}
            {settings.scraper_type !== 'none' && settings.scrape_strategy === 'custom' && (
               <div className="settings__section__select mb-5">
                  <SelectField
                     label='Số trang kết quả Google cần kiểm tra'
                     options={paginationLimitOptions}
                     selected={[String(settings?.scrape_pagination_limit || 5)]}
                     defaultLabel="Chọn số trang"
                     updateField={(updated:string[]) => updated[0] && updateSettings('scrape_pagination_limit', parseInt(updated[0], 10))}
                     multiple={false}
                     rounded={'rounded'}
                     minWidth={220}
                  />
                  <small className='text-gray-500 pt-2 block'>Mỗi trang có tối đa 10 kết quả. 5 trang = kiểm tra top 50. Mỗi trang tốn khoảng 1 credit <InfoTip term='credit' />.</small>
               </div>
            )}
            {settings.scraper_type !== 'none' && settings.scrape_strategy === 'smart' && (
               <div className="settings__section__input mb-5">
                  <ToggleField
                     label='Dự phòng đầy đủ: kiểm tra tất cả các trang nếu không thấy ở các trang gần đó'
                     value={!!settings?.scrape_smart_full_fallback}
                     onChange={(val) => updateSettings('scrape_smart_full_fallback', val)}
                  />
                  <small className='text-gray-500 pt-2 block'>
                     Khi bật, cả 10 trang sẽ được kiểm tra nếu không thấy từ khóa gần vị trí lần trước.
                  </small>
               </div>
            )}
            {settings?.scrape_retry && (settings.failed_queue?.length || 0) > 0 && (
               <div className="settings__section__input mb-5">
                  <label className={labelStyle}>Xóa hàng đợi thử lại</label>
                  <button
                  onClick={() => clearFailedMutate()}
                  className=' py-3 px-5 w-full rounded cursor-pointer bg-gray-100 text-gray-800
                  font-semibold text-sm hover:bg-gray-200'>
                     {clearingQueue && <Icon type="loading" size={14} />} Xóa hàng đợi lỗi
                       ({settings.failed_queue?.length || 0} từ khóa)
                  </button>
               </div>
            )}
      </div>
   </div>
   );
};

export default ScraperSettings;
