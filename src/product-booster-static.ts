/**
 * This object is to contain constants and CSS selectors related to `ProductBooster` to make `ProductBooster` more compcat.
 */
class ProductBoosterStatics {
    // Constants below represent time in seconds.
    // Time used for after effect of an simple action. Such as button click, or view scroll.
    static SHORT_TIME = 500;
    // Tiem used to wait for animation to to finish, etc
    static MEDIUM_TIME = 4e3;
    // Time used for such as : finish loading network, etc.
    static LONG_TIME = 12e3;
    // Seconds until boost retry if any errors occured.  
    static retryy_timeout = 5 * 60; // 5 MINUTES;
    // Total products to boost
    static TOTAL_PRODUCTS_TO_BOOST: number = 7;
    // Maximum number of concurrently boosted products .
    static MAX_BOOST_SLOTS: number = 5;
    // How long the boostedproduct will last until can be boosted again (in seconds)
    static BOOSTED_DURATION = 4 * 60 * 60; // 4 hours
    // Boost interval, elapsed boost time between products, in seconds
    static BOOST_INTERVAL: number = Math.ceil(ProductBoosterStatics.BOOSTED_DURATION / ProductBoosterStatics.MAX_BOOST_SLOTS);

}

export default ProductBoosterStatics;
