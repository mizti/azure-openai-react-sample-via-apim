import React, { useEffect, useState } from 'react'
import "./Home.css"
import { AuthenticatedTemplate, UnauthenticatedTemplate, useIsAuthenticated } from "@azure/msal-react";
import axios from 'axios';
import { useMsal } from "@azure/msal-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

const Home = () => {
    const isAuthenticated = useIsAuthenticated();
    const [query, setQuery] = useState("お勧めの春野菜レシピを教えて");
    const [responseText, setResponseText] = useState('');
    const { instance } = useMsal();
    const [request_token, setRequestToken] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function acquireApiAccessToken() {
            try {
                const account = instance.getAllAccounts()[0];
                if (!account) {
                    throw new Error("User not logged in.");
                }

                const tokenRequest = {
                    scopes: [`${process.env.REACT_APP_APIM_SCOPE}`],
                    account: account
                };

                try {
                    const response = await instance.acquireTokenSilent(tokenRequest);
                    setRequestToken(response.accessToken);
                    return response.accessToken;
                } catch (error) {
                    console.error("Error acquiring token:", error);
                    throw error;
                }
            }
            catch (error) {
                console.error('Error acquiring OpenAI token or calling ChatCompletion API:', error);
            }
        }
        acquireApiAccessToken();
    }, [isAuthenticated]);

    const requestOpenAiChat = async () => {
        //if (!request_token) return;
        //const apiUrl = `https://${process.env.REACT_APP_OPEN_AI_SUBDOMAIN}.openai.azure.com/openai/deployments/${process.env.REACT_APP_OPEN_AI_MODEL_NAME}/chat/completions?api-version=${process.env.REACT_APP_OPEN_AI_API_VERSION}`;
        const apiUrl = `https://${process.env.REACT_APP_OPEN_AI_SUBDOMAIN}.azure-api.net/api/deployments/${process.env.REACT_APP_OPEN_AI_MODEL_NAME}/chat/completions?api-version=${process.env.REACT_APP_OPEN_AI_API_VERSION}`;

        console.log(request_token)
        const headers = {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': `${process.env.REACT_APP_APIM_SUBSCRIPTION_KEY}`,
            'Authorization': 'Bearer ' + request_token 
        };
        const data = {
            messages: [
                {
                    role: 'system', 
                    content: '聞かれた内容に簡潔に答えるようにしてください。',
                },
                {
                    role: 'user',
                    content: query,
                },
            ],
            temperature: 0.5,
            max_tokens: 800,
            top_p: 0.95,
            frequency_penalty: 0,
            presence_penalty: 0,
            stop: null,
        };

        try {
            setIsLoading(true);
            const response = await axios.post(apiUrl, data, { headers });
            setIsLoading(false);
            setResponseText(response?.data?.choices[0]?.message?.content);
            console.log(response.data?.usage?.total_tokens)
        } catch (error) {
            // 403 error
            if (error.response.status === 429) {
                setIsLoading(false);
                setResponseText('APIの呼び出し回数が上限に達しました。しばらく時間をおいてから再度お試しください。')
                console.error('Error calling ChatCompletion API:', error);
            } else {
                setIsLoading(false);
                console.error('Error calling ChatCompletion API:', error);
            }
        }
    };

    return (
        <div className="homePage">
            <UnauthenticatedTemplate>
                <h5 className="unauthmessage">
                    ログインしてください
                </h5>
            </UnauthenticatedTemplate>

            <AuthenticatedTemplate>
                <div className="postContainer">
                    <h1>Chat SPA Simple Demo</h1>
                    <div className="inputPost">
                        <div>好きなメッセージを入力してください</div>

                        <textarea className="inputText" type="text" placeholder="好きなメッセージを入力してください" onChange={(e => setQuery(e.target.value))} />
                    </div>
                    <button className="postButton" onClick={requestOpenAiChat}>投稿する</button>

                    <div className="inputPost">
                        <div>Open AIからの返答</div>
                        <div className="responseTextWrapper">
                            <textarea
                                className="responseText"
                                type="text"
                                placeholder="Azure OpenAIからの返答が表示されます"
                                value={responseText}
                                readOnly
                            />
                            {isLoading &&
                                <div className="loading-icon">
                                    <FontAwesomeIcon icon={faSpinner} spin size="3x" />
                                </div>
                            }
                        </div>
                    </div>
                </div>
            </AuthenticatedTemplate>
        </div>

    )
};

export default Home
