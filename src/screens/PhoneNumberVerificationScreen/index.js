import React, { useState, useEffect } from 'react';
import { 
    SafeAreaView,
    TouchableOpacity,
    View,
    Text,
    Keyboard,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import {connect} from 'react-redux';
import {StackActions} from '@react-navigation/native';
import FirebaseAuth from '@react-native-firebase/auth';
import FirebaseFirestore from '@react-native-firebase/firestore';
import FirebaseMessaging from '@react-native-firebase/messaging';

import styles from './styles';
import Color from '../../constants/Colors';
import {fetchCurrentUser} from '../../../redux/currentUser/currentUserActions';
import {setIsSignedIn} from '../../../redux/authentication/authenticationActions';

const TEXT = {
    wrongPhoneNumber: 'Wrong phone number? ',
    changePhoneNumber: 'Change phone number',
    buttonVerify: 'Verify',
    placeHolder: 'Your verification code',
}

const PhoneNumberVerificationScreen = ({currentUser, route, ... props}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [verificationCode, setVerificationCode] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    useEffect(() => {
        if (!currentUser.uid) {
            return;
        }

        if (FirebaseAuth().currentUser?.displayName) {
            prepareSignedIn();
            return;
        }

        navigateToAccountInformationScreen();
    }, [currentUser])

    useEffect(() => {
        if (!errorMessage) {
            return;
        }

        setErrorMessage(null);
    }, [verificationCode])

    const prepareVerifyPhoneNumber = () => {
        Keyboard.dismiss();
        setIsLoading(true);
        
        if (!verificationCode || verificationCode?.length < 6) {
            setErrorMessage('Verification code not valid!');
            setIsLoading(false);
            return false;
        }

        verifyPhoneNumber();
    }
    
    const verifyPhoneNumber = async() => {
        try {
            await route.params?.confirmation?.confirm(verificationCode);
            props.fetchCurrentUser();
        } catch(err) {
            setIsLoading(false);
            setErrorMessage('Invalid verification code!');
        }
    }

    const prepareSignedIn = async() => {
        const tokenNotification = await FirebaseMessaging().getToken();
        await FirebaseFirestore().collection('users').doc(FirebaseAuth().currentUser?.uid).update({status: 'Online', tokenNotification});
        props.setIsSignedIn(true);
    }

    const getStylesTextInput = () => {
        if (errorMessage) {
            return [styles.input, styles.inputError];
        }

        return styles.input;
    }

    const navigateToLoginScreen = () => {
        props.navigation.dispatch(
            StackActions.replace('LoginScreen')
        );
    }

    const navigateToAccountInformationScreen = () => {
        props.navigation.dispatch(
            StackActions.replace('AccountInformationScreen')
        );
    }

    const prepareSetVerificationCode = (verifyCode) => {
        let lastCode = verifyCode[verifyCode.length - 1];

        if (['.', ',', ' ', '-'].includes(lastCode)) {
            return;
        }

        setVerificationCode(verifyCode);
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.containerVerificationBox}>
                <View style={styles.containerInput}>
                    <TextInput 
                        maxLength={6}
                        caretHidden={true}
                        style={getStylesTextInput()}
                        placeholder={TEXT.placeHolder}
                        value={verificationCode}
                        keyboardType='number-pad'
                        onChangeText={prepareSetVerificationCode}
                        onSubmitEditing={prepareVerifyPhoneNumber}/>
                </View>
                <View style={styles.containerButton}>
                    {isLoading ? (
                        <ActivityIndicator
                            color={Color.white}
                            size={30}/>
                    ) : (
                        <TouchableOpacity onPress={prepareVerifyPhoneNumber}>
                            <Text style={styles.textButton}>{TEXT.buttonVerify}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            {errorMessage && (
                <View style={styles.containerErrorMessage}>
                    <Text style={styles.textErrorMessage}>{errorMessage}</Text>
                </View>
            )}
            <View style={styles.containerTextWrongPhoneNumber}>
                <Text>{TEXT.wrongPhoneNumber}</Text>
                <TouchableOpacity onPress={navigateToLoginScreen}>
                    <Text style={styles.textWrongPhoneNumber}>{TEXT.changePhoneNumber}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const mapStateToProps = ({currentUser}) => ({
    currentUser,
});

const mapDispatchToProps = {
    fetchCurrentUser,
    setIsSignedIn,
};

export default connect(mapStateToProps, mapDispatchToProps)(PhoneNumberVerificationScreen);