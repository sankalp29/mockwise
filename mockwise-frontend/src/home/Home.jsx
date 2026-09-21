import HomeUpperBody from './HomeUpperBody'
import HomeMiddleBody from './HomeMiddleBody'
import PlatformPreview from './PlatformPreview'
import CompanyLogos from './CompanyLogos'
import FAQSection from './FAQSection'
import AboutUsSection from './AboutUsSection'

function Home() {
  return (
    <div>
        <div className='py-0'>
            <HomeUpperBody />
        </div>
        <div className='py-0'>
          <CompanyLogos />
        </div>
        <div className='py-0'>
            <HomeMiddleBody />
        </div>
        <div className='py-0'>
          <PlatformPreview />
        </div>
        {/* <div className='py-0'>
          <TestimonialSection />
        </div> */}
        <div className='py-0'>
          <AboutUsSection />
        </div>
        <div className='py-0'>
          <FAQSection />
        </div>
    </div>
  )
}

export default Home