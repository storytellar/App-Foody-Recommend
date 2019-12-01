import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  AsyncStorage,
  FlatList,
  ActivityIndicator,
  Text,
  TouchableOpacity
} from "react-native";
import SafeAreaView from "react-native-safe-area-view";
import * as Location from "expo-location";
import * as Permissions from "expo-permissions";

import  { getListRecommendStore, 
          getBanners, 
          getCategory 
        } from "../controllers/store.controller";

import Shop from "../components/Shop";
import Category from "../components/Category";
import Banner from "../components/Banner";

const windowWidth = Dimensions.get("window").width;

const RecommendScreen = props => {
  // Declare hook
  const [location, setLocation] = React.useState({ latitude: 0, longitude: 0 });
  const [stores, setStores] = React.useState([]);
  const [banners, setBanners] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [lastPageReached, setLastPageReached] = React.useState(false);
  const [pageNumber, setPageNumber] = React.useState(1);
  const [error, setError] = React.useState("");
  const [suggestOption, setSuggestOption] = React.useState(1);

  // First running => Get all necessary data
  React.useEffect(() => {
    getSuggestedStores();
    loadBanners();
    loadCategory();
  }, []);

  // Get location (latlong) of user through their GPS
  _getLocationAsync = async () => {
    let location;
    let { status } = await Permissions.askAsync(Permissions.LOCATION);
    if (status !== "granted") {
      console.log("Permission to access location was denied");
      setLocation({ latitude: 0, longitude: 0 });
    }
    try {
      location = await Location.getCurrentPositionAsync({});
      setLocation(location.coords);
    } 
    catch (error) {}
  };

  // Get all info about store
  const getSuggestedStores = async () => {
    if (lastPageReached) return;
    setLoading(true);

    await _getLocationAsync();

    let token = (JSON.parse(await AsyncStorage.getItem("@account"))).token;
    let data = await getListRecommendStore(token, pageNumber, location.latitude, location.longitude, props )

    if (data == null) {
      setLastPageReached(true);
    }
    else {
      let newStoreList = stores.concat(data);
      setStores(newStoreList);
      setPageNumber(pageNumber + 1);
    }
    
    setLoading(false);
  };
  
  // Function for jumping detail page
  const goDetail = storeID => {
    props.navigation.navigate("Detail", { storeID });
  };

  // Store data (key-value) to localStorage
  const _storeData = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {}
  };

  // Load all info of banners
  loadBanners = async () => {
    let token = (JSON.parse(await AsyncStorage.getItem("@account"))).token;
    let data = await getBanners(token);

    if (data != null) {
      setBanners(data)
      return
    }

    setBanners([])
  }

  // Load all info of category list
  loadCategory = async () => {
    let token = (JSON.parse(await AsyncStorage.getItem("@account"))).token;
    let data = await getCategory(token);

    if (data != null) {
      setCategories(data)
      return
    }

    setCategories([])
  }

  // Catching error
  if (error.length != 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Error: {error}</Text>
        <Text>You should re-login for loading data again</Text>
      </SafeAreaView>
    );
  }
  
  // Render view
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.containerScrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner list */}
        <View style={styles.bannerScrollWrapper}>
          <ScrollView
            contentContainerStyle={styles.bannerScroll}
            horizontal={true}
            showsHorizontalScrollIndicator={false}
          >
            <View style={{ width: windowWidth / 10 - 10 }}></View>
            { 
              banners.map((banner) => {
                return (
                  <Banner
                    key={banner.store_id}
                    onPressBanner={() => goDetail(banner.store_id)}
                    img={banner.img}
                  />
                )
              }) 
            }
            <View style={{ width: windowWidth / 10 }}></View>
          </ScrollView>
        </View>

        {/* Category list */}
        <View style={styles.CategoryWrapper}>
          { 
           categories.map((cate) => {
             return (
              <Category
                key={cate.concern_id}
                name={cate.short_label}
                onPressButton={() => {
                  _storeData("@keyword", cate.label);
                  props.navigation.navigate("Search");
                }}
              />
             )
           })
          }
        </View>

        {/* Classify List (Button) */}
        <View style={styles.optionButtons}>
          <TouchableOpacity 
            style={[styles.optionLeftButton, (suggestOption === 1) ? styles.optionActiveButton : '']}
            onPress={() => setSuggestOption(1)}
          >
            <Text style={[styles.optionText, (suggestOption === 1) ? styles.optionActiveText : '']}>FOOD</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.optionRightButton, (suggestOption === 2) ? styles.optionActiveButton : '' ]}
            onPress={() => setSuggestOption(2)}
          >
            <Text style={[styles.optionText, (suggestOption === 2) ? styles.optionActiveText : '' ]}>STORE</Text>
          </TouchableOpacity>
        </View>
        {
          (suggestOption == 1) ? 
          (
            // Food list
            <Text>Food</Text> 
          ) :
          (
            // Store list
            <FlatList
              showsVerticalScrollIndicator={false}
              style={{flex: 1}}
              contentContainerStyle={{flex: 1, paddingHorizontal: 15 }}
              data={stores}
              onEndReached={getSuggestedStores}
              onEndReachedThreshold={1}
              ListFooterComponent={
                lastPageReached ? 
                (
                  <Text style={{ textAlign: "center" }}>
                    End of page
                  </Text>
                ) : 
                (
                  <ActivityIndicator size="large" loading={loading} />
                )
              }
              renderItem={({ item }) => (
                <Shop
                  vote={item.stars}
                  shop={item.store_name}
                  isLove={item.isFavorite}
                  price={item.avg_price}
                  distance={item.distance}
                  image={item.imgLink}
                  onPressLove={() => {
                    alert(item.store_id);
                  }}
                  onPressItem={() => {
                    item.onPressItem(item.store_id);
                  }}
                />
              )}
              keyExtractor={item => item.store_id}
            />
          )
        }
      </ScrollView>
    </SafeAreaView>
  );
};

RecommendScreen.navigationOptions = {
  header: null
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFFCFA"
  },
  containerScrollView: {
    alignItems: "center"
  },
  bannerScrollWrapper: {
    height: 200,
    marginTop: 20
  },
  CategoryWrapper: {
    marginTop: 10,
    width: (9.5384615385 * windowWidth) / 12,
    height: 85,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  optionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 5
  },
  optionLeftButton: {
    flexDirection: "row",
    backgroundColor: "white",
    width: (9.5384615385 * windowWidth) / 12 / 2 - 20,
    height: 40,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#DC8D66"
  },
  optionRightButton: {
    flexDirection: "row",
    backgroundColor: "white",
    width: (9.5384615385 * windowWidth) / 12 / 2 - 20,
    height: 40,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#DC8D66"
  },
  optionActiveButton: {
    backgroundColor: "#DC8D66"
  },
  optionText: { fontSize: 16, color: "#DC8D66", fontWeight: "500" },
  optionActiveText: { color: "white" }
});

export default RecommendScreen;
